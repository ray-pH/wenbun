<script lang="ts">
    import { base } from '$app/paths';
    import { App, WenBunCustomState } from "$lib/app";
    import CharacterWriter from "$lib/components/CharacterWriter.svelte";
    import * as FSRS from "ts-fsrs"
    import { onMount } from "svelte";
    import { type CharacterWriterConfig, type CharacterWriterData } from "$lib/util";
    import { ChineseCharacterWordlist, ChineseMandarinReading } from "$lib/chinese";
    import TopBar from "$lib/components/TopBar.svelte";
    import { DECK_TAGS } from '$lib/constants';
    import { AutoReview, type AutoReviewData } from '$lib/autoReview';
    import { fly, fade } from 'svelte/transition';
    import { cubicOut } from 'svelte/easing';
    import ZhDict from '$lib/components/ZhDict.svelte';
    import SlideablePopup from '$lib/components/SlideablePopup.svelte';
    
    const inFlyParam = { delay: 100, y : -100, duration: 300, easing: cubicOut };
    const outFadeParam = { duration: 200 };

    export let data: {deckId?: string, isExtraStudy?: boolean, cardIds?: string};
    let deckId = data.deckId || '';
    let cardIdsStr = data.cardIds || encodeURIComponent('[]');
    let cardIds = JSON.parse(decodeURIComponent(cardIdsStr));
    let title = data.isExtraStudy ? 'Extra Study' : 'Review';
    
    type ReviewButton = {
        label: string;
        sublabel?: string;
        className?: string;
        onclick?: () => void;
        isComplete?: boolean;
        alternate?: Omit<ReviewButton, 'alternate'>;
    };
    
    let autoReviewData: AutoReviewData;
    let isPageReady = false;
    let app = new App();
    let characterWriterRef: CharacterWriter;
    let showDictModal = false;
    onMount(async () => {
        // no need to sync in here
        await app.init();
        const tags = app.deckData[deckId]?.tags;
        isZhCantonese = tags?.includes(DECK_TAGS.ZH_YUE);
        const isUseExtraDict = tags?.includes(DECK_TAGS.ZH_EXTRA_DICT);
        await wordlist.init(isZhCantonese ? 'yue' : 'zh', isUseExtraDict);
        app = app;
        isZhTraditional = tags?.includes(DECK_TAGS.ZH_TRAD);
        isAutoGrading = app.isAutoGrading();
        isGradeWarmUpCards = app.getConfig().gradeWarmUpCards;
        isPageReady = true;
        if (data.isExtraStudy) app.extraStudyHandler.registerReviewCardIdsOverride(cardIds);
        nextCard();
    })
    
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
    $: isFirstTime = cardState === WenBunCustomState.New;
    $: isWarmUp = cardState === WenBunCustomState.WarmUp;
    
    const reviewButtonsLabel = ['Fail', 'Hard', 'Good', 'Easy'];
    
    let currentCardId: number | undefined = undefined;
    let scheduledTimeStr: Record<FSRS.Grade, string> = {1: '', 2: '', 3: '', 4: ''};
    function resetState() {
        isComplete = false;
        isNewCardInteractedWith = false;
        autoGrade = undefined;
        isRequestManualGrade = false;
    }
    function nextCard() {
        resetState();
        isCardChanged = true;
        const id = app.getNextCard(deckId);
        if (id === undefined) {
            // done for today
            isDoneToday = true;
            return;
        }
        const card = app.getCard(deckId, id, true);
        if (!card) return;
        isCardChanged = false;
        currentCardId = id;
        scheduledTimeStr = app.getRatingScheduledTimeStr(deckId, id);
        cardState = app.getWenbunCustomState(deckId, id);
        _changeCounter++;
    }
    
    async function onLearnNewCard() {
        app.startWarmUp(deckId, currentCardId!);
        await app.save();
        isNewCardInteractedWith = true;
        currentCardId = currentCardId;
        scheduledTimeStr = app.getRatingScheduledTimeStr(deckId, currentCardId!);
        cardState = app.getWenbunCustomState(deckId, currentCardId!);
    }
    
    async function onSkipWarmUp() {
        app.skipWarmUp(deckId, currentCardId!);
        isNewCardInteractedWith = true;
        await app.save();
        nextCard();
    }
    
    function characterWriterDataFromId(id: number): CharacterWriterData | undefined {
        const word = app.getCardWord(deckId, id);
        const config = app.getConfig();
        return wordlist.getCharacterWriterData(word, {
            convertToTraditional: isZhTraditional,
            mandarinReading: config.zh.mandarinReading,
            isCantonese: isZhCantonese,
            isPlayAudio: config.zh.playAudio,
        });
    }
    function getCardConfig(id: number): CharacterWriterConfig {
        const warmUpCount = app.getWarmUpCount(deckId, id);
        const isFirstWarmUp = isWarmUp && warmUpCount === 0;
        return {
            isFirstTime,
            isWarmUp,
            isFinalWarmUp: isFinalWarmUp(id),
            warmUpCount,
            warmUpMaxCount: app.getMaxWarmUpCount(),
            isGradeWarmUpCards: app.getConfig().gradeWarmUpCards,
            isShowOutline: isFirstTime || isFirstWarmUp,
            lang: isZhCantonese ? 'yue' : 'zh',
        }
    }
    function onComplete(data: AutoReviewData) {
        isComplete = true;
        if (isAutoGrading) autoGrade = AutoReview.getGrade(data);
    }
    async function onReviewButtonClick(grade: FSRS.Grade) {
        app.rateCard(deckId, currentCardId!, grade);
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
        app.addIgnoredMark(deckId, currentCardId!);
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
        app.rateCard(deckId, currentCardId!, autoGrade!);
        await app.save();
        nextCard();
    }
    function onManualChangeToAutoGrade(grade: FSRS.Grade) {
        autoGrade = grade;
        isRequestManualGrade = false;
    }
    
    async function warmUpNext() {
        app.warmUpNext(deckId, currentCardId!);
        await app.save();
        nextCard();
    }
    
    async function finishWarmUp() {
        // always rate "Again" when finishing warm-up
        await onReviewButtonClick(FSRS.Rating.Again);
    }
    
    function isFinalWarmUp(id: number, _changeCounter?: number): boolean {
        const warmUpCount = app.getWarmUpCount(deckId, id);
        if (warmUpCount === undefined) return true;
        return warmUpCount >= app.getMaxWarmUpCount();
    }
    function isFirstWarmUp(id: number, _changeCounter?: number): boolean {
        const warmUpCount = app.getWarmUpCount(deckId, id);
        return warmUpCount === 0;
    }
    
    $: failButtonAlternate = {
        label: "Reveal", sublabel: "(Fail)", className: "review-button-fail", onclick: () => failAndReveal(),
        isComplete: !autoReviewData?.isFailAndReveal,
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
</script>


<TopBar title={title}></TopBar>
<div class="container">
    {#if isDoneToday} 
        <div>You have done today's review.</div>
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
                <div class="counter">
                    <span class="deck-count-learn-relearn" class:underlined={cardState === WenBunCustomState.Learning || cardState === WenBunCustomState.Relearning}>
                        {app.getLearningRelearningCardsCount(deckId) || ''}
                    </span>
                    <span class="deck-count-review" class:underlined={cardState === WenBunCustomState.ReviewYoung || cardState === WenBunCustomState.ReviewMature}>
                        {app.getScheduledReviewCardsCount(deckId) || ''}
                    </span>
                    <span class="deck-count-new" class:underlined={cardState === WenBunCustomState.New}>
                        {app.getScheduledNewCardsCount(deckId) || ''}
                    </span>
                    <span class="deck-count-new" class:underlined={cardState === WenBunCustomState.WarmUp}>
                        {app.getWarmUpCardsCount(deckId) ? `(${app.getWarmUpCardsCount(deckId)})` : ''}
                    </span>
                    <span class="deck-count-previously-studied" class:underlined={cardState === WenBunCustomState.PreviouslyStudied}>
                        {app.getScheduledPreviouslyStudiedCardsCount(deckId) || ''}
                    </span>
                </div>
            {/if}
        {/key}
        <div class="character-writer-container">
            {#key [currentCardId, isNewCardInteractedWith, isCardChanged]}
                <CharacterWriter 
                    app={app} 
                    bind:this={characterWriterRef}
                    characterData={characterWriterDataFromId(currentCardId)} 
                    onComplete={(data) => onComplete(data)} 
                    onOpenDict={() => openDict()}
                    bind:isRequestManualGrade={isRequestManualGrade}
                    cardConfig={getCardConfig(currentCardId)}
                    autoGrade={autoGrade}
                    bind:autoReviewData={autoReviewData}
                />
            {/key}
        </div>
        {#if isFirstTime}
            {@render ReviewButtons([
          		{ label: "Ignore", sublabel: "(Don't Learn)", className: "review-button-fail", isComplete: true, 
                    onclick: () => ignoreCard() },
          		{ label: "Learn*", sublabel: "(Skip Warm-Up)", className: "review-button-hard", isComplete: true,
                    onclick: () => onSkipWarmUp() },
          		{ label: "" },
          		{ label: "Learn", className: "review-button-easy main-button", isComplete: true,
                    onclick: () => onLearnNewCard() }
           	])}
        {:else if isWarmUp && !isFinalWarmUp(currentCardId, _changeCounter)}
            {@render ReviewButtons([
                { label: "", 
                    alternate: { 
                        ...failButtonAlternate,
                        isComplete: !autoReviewData?.isFailAndReveal && !isFirstWarmUp(currentCardId, _changeCounter),
                    } 
                },
          		{ label: "" },
          		{ label: "" },
          		{ label: "Next", className: "review-button-easy", isComplete,
                    onclick: () => warmUpNext() }
           	])}
        {:else if isWarmUp && isFinalWarmUp(currentCardId, _changeCounter) && !isGradeWarmUpCards}
            <!-- if isGradeWarmup, should go to the last (else) branch -->
            {@render ReviewButtons([
                { label: "", alternate: {...failButtonAlternate, isComplete: !isComplete} },
          		{ label: "" },
          		{ label: "" },
          		{ label: "Next", className: "review-button-easy", isComplete,
                    onclick: () => finishWarmUp() }
           	])}
        {:else if data.isExtraStudy}
           	{@render ReviewButtons([
          		{ label: "Again", sublabel: "(Put Back)", className: "review-button-fail", isComplete, 
                    onclick: () => extraStudyAgain(), alternate: failButtonAlternate
                },
          		{ label: "" },
          		{ label: "" },
          		{ label: "Good", className: "review-button-easy",  isComplete,
                    onclick: () => extraStudyGood() }
           	])}
        {:else if isAutoGrading && !isRequestManualGrade}
           	{@render ReviewButtons([
                { label: "", alternate: {...failButtonAlternate, isComplete: !isComplete} },
          		{ label: "" },
          		{ label: "" },
          		{ label: "Next", className: "review-button-easy",  isComplete,
                    onclick: () => acceptAutoGrade() }
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
            characterData={characterWriterDataFromId(currentCardId)} 
            wordlist={wordlist}
            toneColors={app.getChineseToneColorArray()}
            zhReading={app.getConfig().zh.mandarinReading}
        ></ZhDict>
    {/if}
</SlideablePopup>

{#snippet ReviewButtons(buttons: ReviewButton[], extraClass = "")}
	<div class="bottom-container" in:fly={inFlyParam} out:fade={outFadeParam}>
		<div class={`review-button-container ${extraClass}`}>
			{#each buttons as b}
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
    .bottom-container {
        position: absolute;
        bottom: 0;
        padding-bottom: 3em;
        box-sizing: border-box;
        width: 100vw;
        @media (max-width: 600px) {
            padding-bottom: 0.6em;
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
</style>