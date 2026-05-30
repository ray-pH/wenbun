<script lang="ts">
    import { base } from '$app/paths';
    import { App, ReviewMode, WenBunCustomState, WritingMode } from "$lib/app";
    import CharacterWriter from "$lib/components/CharacterWriter.svelte";
    import * as FSRS from "ts-fsrs"
    import { onDestroy, onMount } from "svelte";
    import { interleaveArrays, isBuiltinDeck, parseIntOrUndefined, type CharacterWriterConfig, type CharacterWriterData } from "$lib/util";
    import { ChineseCharacterWordlist, ChineseMandarinReading, fetchHanziWriterCharData, TONE_PREFIX } from "$lib/chinese";
    import TopBar from "$lib/components/TopBar.svelte";
    import { DECK_TAGS } from '$lib/constants';
    import { AutoReview, type AutoReviewData } from '$lib/autoReview';
    import { fly, fade } from 'svelte/transition';
    import { cubicOut } from 'svelte/easing';
    import { navigationHistory } from '$lib/navigation';
    import ZhDict from '$lib/components/ZhDict.svelte';
    import SlideablePopup from '$lib/components/SlideablePopup.svelte';
    import { ExtraStudyMode } from '$lib/appExtraStudyHandler';
    import Popup from '$lib/components/Popup.svelte';
    import { hanziWriterJSONCache } from '$lib/store.svelte';
    
    const inFlyParam = { delay: 100, y : -100, duration: 300, easing: cubicOut };
    const outFadeParam = { duration: 200 };
    const CHARACTER_WRITER_CACHE_CONCURRENCY = 5;

    export let data: {deckId?: string, isExtraStudy?: boolean, cardIds?: string, mode?: string, reviewMode: ReviewMode};
    let metaDeckId = data.deckId || '';
    let cardIdsStr = data.cardIds || encodeURIComponent('[]');
    let cardIds = JSON.parse(decodeURIComponent(cardIdsStr));
    let title = data.isExtraStudy ? 'Extra Study' : 'Review';
    let isDictationMode = data.mode === ExtraStudyMode.Dictation;
    
    type ReviewButton = {
        label: string;
        sublabel?: string;
        className?: string;
        onclick?: () => void;
        isComplete?: boolean;
        isNextButton?: boolean;
        alternate?: Omit<ReviewButton, 'alternate'>;
    };
    
    let autoReviewData: AutoReviewData;
    let isPageReady = false;
    let app = new App();
    let characterWriterRef: CharacterWriter;
    let showDictModal = false;
    let forceStopAudioOnNextCard = false;
    let isWordSupportedByHanziWriter = true;
    let isCharSupportedByHanziWriter: boolean[] = [];
    let nextButtonAction: (() => void) | undefined = undefined;
    let isDestroyed = false;
    onMount(async () => {
        // no need to sync in here
        await app.init(metaDeckId);
        await app.initProfile(metaDeckId, true);
        const tags = app.deckData[metaDeckId]?.tags;
        isZhCantonese = tags?.includes(DECK_TAGS.ZH_YUE);
        const isUseExtraDict = getIsUseExtraDict(tags);
        await wordlist.init(
            isZhCantonese ? 'yue' : 'zh', isUseExtraDict, 
            app.config.zh.useAiGeneratedAudioForMissingAudio,
            app.getBlacklistAudioSrc(),
        );
        wordlist.registerCustomEntryDict(app.getCustomEntryDict(metaDeckId));
        app = app;
        isZhTraditional = tags?.includes(DECK_TAGS.ZH_TRAD);
        isAutoGrading = app.isAutoGrading(metaDeckId) 
            && app.getConfig(metaDeckId).writingMode !== WritingMode.External
            && app.getConfig(metaDeckId).writingMode !== WritingMode.Manual;
        isGradeWarmUpCards = app.getConfig(metaDeckId).gradeWarmUpCards;
        isPageReady = true;
        if (data.isExtraStudy) app.extraStudyHandler.registerReviewCardIdsOverride(cardIds);
        forceStopAudioOnNextCard = app.getConfig(metaDeckId).zh.forceStopAudioOnNextCard;
        setupNextKeyListener();
        tryCacheCharacterWriterData();
        nextCard();
    })
    onDestroy(() => {
        isDestroyed = true;
        destroyNextKeyListener();
    })
    
    function getIsUseExtraDict(tags: string[] | undefined): boolean {
        // due to backward compatibility, we need to manually make HSK7 deck to use extra dictionary 
        if (isBuiltinDeck(metaDeckId) && metaDeckId.startsWith('hsk7-v3.0')) return true;
        return !!tags?.includes(DECK_TAGS.ZH_EXTRA_DICT);
    }
    
    let isComplete = false;
    let isDoneToday = false;
    let isCardChanged = false;
    let wordlist = new ChineseCharacterWordlist();
    let cardState: WenBunCustomState | undefined = undefined;
    let isNewCardInteractedWith = false;
    let isZhTraditional = false;
    let isZhCantonese = false;
    let isAutoGrading = false;
    let isGradeWarmUpCards = false;
    let autoGrade: FSRS.Grade | undefined = undefined;
    let isRequestManualGrade = false;
    let _changeCounter = 0;
    $: isFirstTime = cardState === WenBunCustomState.New && !data.isExtraStudy;
    $: isWarmUp = cardState === WenBunCustomState.WarmUp;
    
    const reviewButtonsLabel = ['Fail', 'Hard', 'Good', 'Easy'];
    
    let currentCardId: number | undefined = undefined;
    let currentDeckId: string = metaDeckId;
    let scheduledTimeStr: Record<FSRS.Grade, string> = {1: '', 2: '', 3: '', 4: ''};
    function resetState() {
        isComplete = false;
        isNewCardInteractedWith = false;
        autoGrade = undefined;
        isRequestManualGrade = false;
    }

    function stopAudio() {
        if (characterWriterRef) {
            characterWriterRef.stopAllAudio();
        }
    }
    
    const MAX_NEXT_CARD_RETRY_COUNT = 10;
    function getNextCard(): {cardId: number | undefined, deckId: string} | undefined {
        //TODO: avoid duplication in a deterministic way
        let res = undefined;
        for (let i = 0; i < MAX_NEXT_CARD_RETRY_COUNT; i++) {
            res = app.getNextCard(metaDeckId, data.reviewMode);
            const cardId = res?.cardId;
            if (cardId === undefined || cardId !== currentCardId) return res;
        }
        return res;
    }

    function nextCard() {
        if (forceStopAudioOnNextCard) stopAudio();
        resetState();
        isCardChanged = true;
        const cardData = getNextCard();
        const cardId = cardData?.cardId;
        const deckId = cardData?.deckId;
        if (cardId === undefined || deckId === undefined) {
            // done for today
            isDoneToday = true;
            return;
        }
        const card = app.getCard(metaDeckId, cardId, true);
        if (!card) return;
        isCardChanged = false;
        currentCardId = cardId;
        currentDeckId = deckId;
        scheduledTimeStr = app.getRatingScheduledTimeStr(currentDeckId, cardId);
        cardState = app.getWenbunCustomState(currentDeckId, cardId);
        const word = app.deckData[currentDeckId]?.deck[cardId] ?? '';
        isCharSupportedByHanziWriter = Array.from(word).map((char) => wordlist.isCharSupportedByHanziWriter(char));
        isWordSupportedByHanziWriter = isCharSupportedByHanziWriter.every(Boolean);
        _changeCounter++;
    }
    
    async function onLearnNewCard() {
        app.startWarmUp(currentDeckId, currentCardId!);
        await app.save();
        isNewCardInteractedWith = true;
        currentCardId = currentCardId;
        scheduledTimeStr = app.getRatingScheduledTimeStr(currentDeckId, currentCardId!);
        cardState = app.getWenbunCustomState(currentDeckId, currentCardId!);
    }
    
    async function onSkipWarmUp() {
        app.skipWarmUp(currentDeckId, currentCardId!);
        isNewCardInteractedWith = true;
        await app.save();
        nextCard();
    }
    
    function characterWriterDataFromId(id: number): CharacterWriterData | undefined {
        const word = app.getCardWord(currentDeckId, id);
        const config = app.getConfig(metaDeckId);
        return wordlist.getCharacterWriterData(word, {
            convertToTraditional: isZhTraditional,
            mandarinReading: config.zh.mandarinReading,
            isCantonese: isZhCantonese,
            isPlayAudio: config.zh.playAudio,
        });
    }
    function getDictCharData(id: number) {
        const d = characterWriterDataFromId(id);
        return {
            characters: d?.characters ?? "",
            tones: d?.tags.map(tags => getChineseTone(tags) ?? 5) ?? [],
            meaning: d?.meanings[0] ?? "",
        }
    }
    function getChineseTone(tags: string[]): number | undefined {
        for (const tag of tags) {
            if (tag.startsWith(TONE_PREFIX)) {
                return parseIntOrUndefined(tag.substring(TONE_PREFIX.length));
            }
        }
    }
    
    function getCardConfig(id: number): CharacterWriterConfig {
        const warmUpCount = app.getWarmUpCount(currentDeckId, id);
        const isFirstWarmUp = isWarmUp && warmUpCount === 0;
        return {
            isFirstTime,
            isWarmUp,
            isFinalWarmUp: isFinalWarmUp(id),
            warmUpCount,
            warmUpMaxCount: app.getMaxWarmUpCount(),
            isGradeWarmUpCards: app.getConfig(metaDeckId).gradeWarmUpCards,
            isShowOutline: isFirstTime || isFirstWarmUp,
            lang: isZhCantonese ? 'yue' : 'zh',
        }
    }
    function onComplete(data: AutoReviewData) {
        isComplete = true;
        if (isAutoGrading) autoGrade = AutoReview.getGrade(data);
    }
    function onReadyToGoNext() {
        const config = app.getConfig(metaDeckId);
        if (!config.isAutoNextOnSuccess || !isAutoGrading) return;
        if (autoGrade === undefined) return;
        if (autoGrade === FSRS.Rating.Again) return;
        acceptAutoGrade();
    }
    async function onReviewButtonClick(grade: FSRS.Grade) {
        app.rateCard(currentDeckId, currentCardId!, grade);
        await app.save();
        nextCard();
    }
    function getReviewButtonClass(grade: FSRS.Grade): string {
        switch (grade) {
            case FSRS.Rating.Easy: return 'review-button-easy';
            case FSRS.Rating.Good: return 'review-button-good';
            case FSRS.Rating.Hard: return 'review-button-hard';
            case FSRS.Rating.Again: return 'review-button-fail';
        }
    }
    
    async function ignoreCard() {
        app.addIgnoredMark(currentDeckId, currentCardId!);
        await app.save();
        nextCard();
    }


    function extraStudyAgain() {
        app.extraStudyHandler.rateAgain(currentCardId!);
        nextCard();
    }
    function extraStudyGood() {
        app.extraStudyHandler.rateGood(currentCardId!);
        nextCard();
    }
    
    async function acceptAutoGrade() {
        app.storeAutoGradeLog(autoReviewData.correctStrokeCount, autoReviewData.incorrectStrokeCount, autoGrade!);
        app.rateCard(currentDeckId, currentCardId!, autoGrade!);
        await app.save();
        nextCard();
    }
    function onManualChangeToAutoGrade(grade: FSRS.Grade) {
        autoGrade = grade;
        isRequestManualGrade = false;
    }
    
    async function warmUpNext() {
        app.warmUpNext(currentDeckId, currentCardId!);
        await app.save();
        nextCard();
    }
    
    async function finishWarmUp() {
        // always rate "Again" when finishing warm-up
        await onReviewButtonClick(FSRS.Rating.Again);
    }
    
    function isFinalWarmUp(id: number, _changeCounter?: number): boolean {
        const warmUpCount = app.getWarmUpCount(currentDeckId, id);
        if (warmUpCount === undefined) return true;
        return warmUpCount >= app.getMaxWarmUpCount();
    }
    function isFirstWarmUp(id: number, _changeCounter?: number): boolean {
        const warmUpCount = app.getWarmUpCount(currentDeckId, id);
        return warmUpCount === 0;
    }
    
    $: failButtonAlternate = {
        label: "Reveal", sublabel: "(Fail)", className: "review-button-fail", onclick: () => failAndReveal(),
        isComplete: true,
    }
    function failAndReveal() {
        if (characterWriterRef) {
            characterWriterRef.failAndReveal();
            autoGrade = AutoReview.getGrade(autoReviewData);
        }
    }
    
    function openDict() {
        showDictModal = true;
    }
    
    function setNextButtonAction(fun: (() => void) | undefined) {
        nextButtonAction = fun;
    }
    
    let nextKeyButtonCodes: string[] = [];
    let keyDownHandler = (e: KeyboardEvent) => {
        //TODO: pass is complete check as property of ReviewButton
        if (!isComplete) return; 
        if (nextKeyButtonCodes.includes(e.code)) {
            e.preventDefault();
            nextButtonAction?.();
            console.log("next button clicked");
        }
    }
    
    function setupNextKeyListener() {
        const config = app.getConfig(metaDeckId);
        if (!config.enableNextButtonKey) return;
        nextKeyButtonCodes = config.nextButtonKeyCodes.filter(code => !!code) as string[];
        window.addEventListener("keydown", keyDownHandler);
    }
    
    function destroyNextKeyListener() {
        window.removeEventListener("keydown", keyDownHandler);
    }

    async function tryCacheCharacterWriterData() {
        const cards = app.getTodaysCardGrouped(metaDeckId);
        const newOrWarmupsWords = cards.newOrWarmUp.map(c => app.getCardWord(c.deckId, c.cardId)).filter(Boolean);
        const previouslyStudiedWords = cards.previouslyStudied.map(c => app.getCardWord(c.deckId, c.cardId)).filter(Boolean);
        const reviewWords = cards.review.map(c => app.getCardWord(c.deckId, c.cardId)).filter(Boolean);
        const interleaved = interleaveArrays([newOrWarmupsWords, previouslyStudiedWords, reviewWords]);

        const charsToFetch: string[] = [];
        const seen = new Set<string>();
        for (const word of interleaved) {
            for (const char of word) {
                if (hanziWriterJSONCache.has(char) || seen.has(char)) continue;
                seen.add(char);
                charsToFetch.push(char);
            }
        }

        for (let i = 0; i < charsToFetch.length; i += CHARACTER_WRITER_CACHE_CONCURRENCY) {
            if (isDestroyed) return;

            const batch = charsToFetch.slice(i, i + CHARACTER_WRITER_CACHE_CONCURRENCY);
            await Promise.all(batch.map(async (char) => {
                try {
                    const data = await fetchHanziWriterCharData(char);
                    hanziWriterJSONCache.set(char, data);
                    console.log(`preload ${char}`);
                } catch {
                    hanziWriterJSONCache.set(char, null);
                }
            }));
        }
    }
</script>


<TopBar title={title} deckId={metaDeckId}></TopBar>
<div class="container">
    {#if isDoneToday} 
        <div style="margin-top: 2em">You have done today's review.</div>
        <div class="bottom-container">
            <div class="review-button-container">
                <button class="button big-button" onclick={() => navigationHistory.goHomeAndClearHistory()}>
                    Go Back
                </button>
            </div>
        </div>
    {/if}
    {#if isPageReady && (currentCardId !== undefined) && !isDoneToday}
        {#key _changeCounter}
            {#if data.isExtraStudy}
                <div class="counter">
                    <span class="underlined">
                        {#key currentCardId}
                            {app.extraStudyHandler.getCardsCount() || ''}
                        {/key}
                    </span>
                </div>
            {:else}
                <div class="counter" class:is-learn-only={data.reviewMode === ReviewMode.LearnOnly} class:is-review-only={data.reviewMode === ReviewMode.ReviewOnly}>
                    <span class="deck-count-learn-relearn" class:underlined={cardState === WenBunCustomState.Learning || cardState === WenBunCustomState.Relearning}>
                        {app.getLearningRelearningCardsCount(metaDeckId) || ''}
                    </span>
                    <span class="deck-count-review" class:underlined={cardState === WenBunCustomState.ReviewYoung || cardState === WenBunCustomState.ReviewMature}>
                        {app.getScheduledReviewCardsCount(metaDeckId) || ''}
                    </span>
                    <span class="deck-count-new" class:underlined={cardState === WenBunCustomState.New}>
                        {app.getScheduledNewCardsCount(metaDeckId) || ''}
                    </span>
                    <span class="deck-count-new" class:underlined={cardState === WenBunCustomState.WarmUp}>
                        {app.getWarmUpCardsCount(metaDeckId) ? `(${app.getWarmUpCardsCount(metaDeckId)})` : ''}
                    </span>
                    <span class="deck-count-previously-studied" class:underlined={cardState === WenBunCustomState.PreviouslyStudied}>
                        {app.getScheduledPreviouslyStudiedCardsCount(metaDeckId) || ''}
                    </span>
                </div>
            {/if}
        {/key}
        <div class="character-writer-container">
            {#key [currentCardId, isNewCardInteractedWith, isCardChanged]}
                <CharacterWriter 
                    app={app} 
                    deckId={metaDeckId}
                    isShowHealthBar={isAutoGrading && app.getConfig(metaDeckId).showAutoGradingBar}
                    isFailWholeWord={app.getConfig(metaDeckId).failWholeWord}
                    isCharSupportedByHanziWriter={isCharSupportedByHanziWriter}
                    isDictationMode={isDictationMode}
                    bind:this={characterWriterRef}
                    characterData={characterWriterDataFromId(currentCardId)} 
                    onComplete={(data) => onComplete(data)} 
                    onOpenDict={() => openDict()}
                    onReadyToGoNext={() => onReadyToGoNext()}
                    bind:isRequestManualGrade={isRequestManualGrade}
                    cardConfig={getCardConfig(currentCardId)}
                    autoGrade={autoGrade}
                    bind:autoReviewData={autoReviewData}
                    writingMode={app.getConfig(metaDeckId).writingMode}
                />
            {/key}
        </div>
        {#if data.isExtraStudy}
           	{@render ReviewButtons([
          		{ label: "Again", sublabel: "(Put Back)", className: "review-button-fail", isComplete, 
                    onclick: () => extraStudyAgain(), alternate: failButtonAlternate
                },
          		{ label: "" },
          		{ label: "" },
          		{ label: "Good", className: "review-button-easy",  isComplete,
                    onclick: () => extraStudyGood() }
           	])}
        {:else if isFirstTime}
            {@render ReviewButtons([
          		{ label: "Ignore", sublabel: "(Don't Learn)", className: "review-button-fail", isComplete: true, 
                    onclick: () => ignoreCard() },
          		{ label: "Learn*", sublabel: "(Skip Warm-Up)", className: "review-button-hard", isComplete: true,
                    onclick: () => onSkipWarmUp() },
          		{ label: "" },
          		{ label: "Learn", className: "review-button-easy main-button", isComplete: true,
                    onclick: () => onLearnNewCard(), isNextButton: true }
           	])}
        {:else if isWarmUp && !isFinalWarmUp(currentCardId, _changeCounter)}
            {@render ReviewButtons([
                { label: "", 
                    alternate: { 
                        ...failButtonAlternate,
                        isComplete: !isFirstWarmUp(currentCardId, _changeCounter),
                    } 
                },
          		{ label: "" },
          		{ label: "" },
          		{ label: "Next", className: "review-button-easy", isComplete,
                    onclick: () => warmUpNext(), isNextButton: true }
           	])}
        {:else if isWarmUp && isFinalWarmUp(currentCardId, _changeCounter) && !isGradeWarmUpCards}
            <!-- if isGradeWarmup, should go to the last (else) branch -->
            {@render ReviewButtons([
                { label: "", alternate: {...failButtonAlternate, isComplete: !isComplete} },
          		{ label: "" },
          		{ label: "" },
          		{ label: "Next", className: "review-button-easy", isComplete,
                    onclick: () => finishWarmUp(), isNextButton: true }
           	])}
        {:else if isAutoGrading && !isRequestManualGrade}
           	{@render ReviewButtons([
                { label: "", alternate: {...failButtonAlternate, isComplete: !isComplete} },
          		{ label: "" },
          		{ label: "" },
          		{ label: "Next", className: "review-button-easy",  isComplete,
                    onclick: () => acceptAutoGrade(), isNextButton: true }
           	])}
        {:else if isAutoGrading && isRequestManualGrade}
           	{@render ReviewButtons(
          		reviewButtonsLabel.map((label, i) => ({
         			label,
         			sublabel: scheduledTimeStr[(i+1) as FSRS.Grade],
         			className: getReviewButtonClass(i+1) + " time",
                    isComplete,
         			onclick: () => onManualChangeToAutoGrade(i+1)
          		})),
                "pulsing"
           	)}
        {:else}
           	{@render ReviewButtons(
          		reviewButtonsLabel.map((label, i) => ({
         			label,
         			sublabel: scheduledTimeStr[(i+1) as FSRS.Grade],
         			className: getReviewButtonClass(i+1) + " time",
                    isComplete,
                    alternate: i == 0 ? failButtonAlternate : undefined,
         			onclick: () => onReviewButtonClick(i+1)
          		}))
           	)}
        {/if}
    {/if}
</div>

<SlideablePopup bind:isOpen={showDictModal} onClose={() => (showDictModal = false)}>
    {#if currentCardId !== undefined}
        <ZhDict
            charData={getDictCharData(currentCardId)} 
            wordlist={wordlist}
            toneColors={app.getChineseToneColorArray()}
            zhReading={app.getConfig(metaDeckId).zh.mandarinReading}
            isShowPlecoLink={app.getConfig(metaDeckId).isShowPlecoLink}
            isShowDongLink={app.getConfig(metaDeckId).isShowDongLink}
        ></ZhDict>
    {/if}
</SlideablePopup>

{#snippet ReviewButtons(
    buttons: ReviewButton[], 
    extraClass = "",
)}
	<div class="bottom-container" in:fly={inFlyParam} out:fade={outFadeParam}>
		<div class={`review-button-container ${extraClass}`}>
			{#each buttons as b}
			    <div style="display: none">
    			    {#if b.isNextButton && b.onclick}
    					{ setNextButtonAction(b.onclick) }
    				{:else}
   					    { setNextButtonAction(undefined) }
    				{/if}
				</div>
			    {#if b.alternate && !b.isComplete && b.alternate.isComplete}
					<button
    					class={`review-button ${b.alternate.className || b.className || ""}`}
    					class:is-complete={!b.isComplete}
    					onclick={b.alternate.onclick}
    				>
    					<div class="review-button-inner">
    						<div class="review-time">{b.alternate.sublabel || b.sublabel || '\u00A0'}</div>
    						<div class="review-label">{b.alternate.label || b.label || '\u00A0'}</div>
    					</div>
    				</button>
				{:else}
    				<button
    					class={`review-button ${b.className || ""}`}
    					class:is-complete={b.isComplete}
    					onclick={b.onclick}
    				>
    					<div class="review-button-inner">
    						<div class="review-time">{b.sublabel || '\u00A0'}</div>
    						<div class="review-label">{b.label || '\u00A0'}</div>
    					</div>
    				</button>
				{/if}
			{/each}
		</div>
	</div>
{/snippet}

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin-bottom: calc(5em + var(--safe-bottom, 0em));
    }
    .character-writer-container {
        margin: 0;
    }
    .counter {
        margin-top: 0.5em;
        margin-bottom: -0.5em;
        .underlined {
            text-decoration: underline;
        }
        .deck-count-learn-relearn {
            color: var(--wenbun-red)
        }
        .deck-count-review {
            color: var(--wenbun-green)
        }
        .deck-count-new {
            color: var(--wenbun-blue);
        }
        .deck-count-previously-studied {
            color: var(--wenbun-orange);
        }
    }
    .counter.is-learn-only {
        .deck-count-learn-relearn,
        .deck-count-review,
        .deck-count-previously-studied {
            display: none;
        }
    }
    .counter.is-review-only {
        .deck-count-new {
            display: none;
        }
    }
    .bottom-container {
        position: fixed;
        bottom: 0;
        padding-bottom: calc(3em + var(--safe-bottom, 0em));
        box-sizing: border-box;
        background-color: #E0E0E0;
        width: 100vw;
        @media (max-width: 600px) {
            padding-bottom: calc(0.6em + var(--safe-bottom, 0em));
        }
    }
    .review-button-container {
        width: 100vw;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
    }
    .review-label {
        font-weight: bold;
        padding: 0.2em 0;
    }
    .review-button-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    @media (max-width: 600px) {
        .review-button:not(.time) {
            .review-time {
                font-size: 0.8em;
            }
        }
    }
    .review-button {
        all: unset;
        position: relative;
        cursor: pointer;
        color: var(--color);
        padding: 0.5em 0;
        flex-grow: 1;
        max-width: 8.5em;
        border-radius: 0.5em;
        background-color: #E0E0E090;
        text-align: center;
        &.main-button {
            min-width: min(8.5em, 35vw);
        }
        &:not(.is-complete) {
            --color: gray;
            pointer-events: none;
            opacity: 0.5;
            .review-time {
                visibility: hidden;
            }
            .review-label {
                visibility: hidden;
            }
        }
        &.is-complete {
            &.review-button-fail {
                --color: var(--wenbun-red);
            }
            &.review-button-hard {
                --color: black;
            }
            &.review-button-good {
                --color: var(--wenbun-green);
            }
            &.review-button-easy {
                --color: var(--wenbun-blue);
            }
        }
    }
    .review-button:hover {
        background-color: lightgray;
    }
    .review-button::after {
        content: '';
        position: absolute;
        left: 10%;
        bottom: 0;
        width: 80%;
        height: 0.3em;
        background-color: var(--color, var(--wenbun-blue)); /* or any color */
        border-radius: 0.2em;
        z-index: 1;
    }
    .pulsing .review-button::after {
        animation: pulsing 1s infinite;
    }
    @keyframes pulsing {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
    
    .big-button {
        padding: 1.5em 5em;
        max-width: 25em;
        margin: auto;
    }
</style>