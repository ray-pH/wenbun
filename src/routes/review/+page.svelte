<script lang="ts">
    import { base } from '$app/paths';
    import { App, WenBunCustomState } from "$lib/app";
    import CharacterWriter from "$lib/components/CharacterWriter.svelte";
    import * as FSRS from "ts-fsrs"
    import { onMount } from "svelte";
    import { type CharacterWriterConfig, type CharacterWriterData } from "$lib/util";
    import { ChineseCharacterWordlist } from "$lib/chinese";
    import TopBar from "$lib/components/TopBar.svelte";
    import { DECK_TAGS } from '$lib/constants';
    import { AutoReview, type AutoReviewData } from '$lib/autoReview';
    import { fly, fade } from 'svelte/transition';
    import { cubicOut } from 'svelte/easing';
    
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
    };
    
    let isPageReady = false;
    let app = new App();
    onMount(async () => {
        await app.init();
        isZhCantonese = app.deckData[deckId]?.tags?.includes(DECK_TAGS.ZH_YUE);
        await wordlist.init(isZhCantonese ? 'yue' : 'zh');
        app = app;
        isZhTraditional = app.deckData[deckId]?.tags?.includes(DECK_TAGS.ZH_TRAD);
        isAutoGrading = app.isAutoGrading();
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
    let autoGrade: FSRS.Grade | undefined = undefined;
    let isRequestManualGrade = false;
    $: isFirstTime = cardState === WenBunCustomState.New && !isNewCardInteractedWith;
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
    }
    
    function onNewCardInteracted() {
        isNewCardInteractedWith = true;
        currentCardId = currentCardId;
        scheduledTimeStr = app.getRatingScheduledTimeStr(deckId, currentCardId!);
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
    function getCardConfig(_id: number): CharacterWriterConfig {
        return {
            isFirstTime: isFirstTime,
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
        app.rateCard(deckId, currentCardId!, autoGrade!);
        await app.save();
        nextCard();
    }
    function onManualChangeToAutoGrade(grade: FSRS.Grade) {
        autoGrade = grade;
        isRequestManualGrade = false;
    }
</script>


<TopBar title={title} backUrl="{base}/"></TopBar>
<div class="container">
    {#if isDoneToday} 
        <div>You have done today's review.</div>
    {/if}
    {#if isPageReady && (currentCardId !== undefined) && !isDoneToday}
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
                <span class="deck-count-previously-studied" class:underlined={cardState === WenBunCustomState.PreviouslyStudied}>
                    {app.getScheduledPreviouslyStudiedCardsCount(deckId) || ''}
                </span>
            </div>
        {/if}
        <div class="character-writer-container">
            {#key [currentCardId, isNewCardInteractedWith, isCardChanged]}
                <CharacterWriter 
                    app={app} 
                    characterData={characterWriterDataFromId(currentCardId)} 
                    onComplete={(data) => onComplete(data)} 
                    bind:isRequestManualGrade={isRequestManualGrade}
                    cardConfig={getCardConfig(currentCardId)}
                    autoGrade={autoGrade}
                />
            {/key}
        </div>
        {#if isFirstTime}
            {@render ReviewButtons([
          		{ label: "Ignore", sublabel: "(Don't Learn)", className: "review-button-fail", isComplete: true, 
                    onclick: () => ignoreCard() },
          		{ label: "" },
          		{ label: "" },
          		{ label: "Learn", className: "review-button-easy", isComplete: true,
                    onclick: () => onLearnNewCard() }
           	])}
        {:else if data.isExtraStudy}
           	{@render ReviewButtons([
          		{ label: "Again", sublabel: "(Put Back)", className: "review-button-fail", isComplete, 
                    onclick: () => extraStudyAgain() },
          		{ label: "" },
          		{ label: "" },
          		{ label: "Good", className: "review-button-easy",  isComplete,
                    onclick: () => extraStudyGood() }
           	])}
        {:else if isAutoGrading && !isRequestManualGrade}
           	{@render ReviewButtons([
                { label: "" },
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
         			className: getReviewButtonClass(i+1),
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
         			className: getReviewButtonClass(i+1),
                    isComplete,
         			onclick: () => onReviewButtonClick(i+1)
          		}))
           	)}
        {/if}
    {/if}
</div>

{#snippet ReviewButtons(buttons: ReviewButton[], extraClass = "")}
	<div class="bottom-container" in:fly={inFlyParam} out:fade={outFadeParam}>
		<div class={`review-button-container ${extraClass}`}>
			{#each buttons as b}
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
            color: #DB6B6C
        }
        .deck-count-review {
            color: #419E6F
        }
        .deck-count-new {
            color: #3E92CC;
        }
        .deck-count-previously-studied {
            color: #DA8C22;
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
                --color: #DB6B6C;
            }
            &.review-button-hard {
                --color: black;
            }
            &.review-button-good {
                --color: #419E6F;
            }
            &.review-button-easy {
                --color: #3E92CC;
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
        background-color: var(--color, #3E92CC); /* or any color */
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