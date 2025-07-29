<script lang="ts">
    import { base } from '$app/paths';
    import { App } from "$lib/app";
    import CharacterWriter from "$lib/components/CharacterWriter.svelte";
    import * as FSRS from "ts-fsrs"
    import { onMount } from "svelte";
    import { type CharacterWriterData } from "$lib/util";
    import { ChineseCharacterWordlist } from "$lib/chinese";
    import TopBar from "$lib/components/TopBar.svelte";

    export let data: {deckId?: string};
    let deckId = data.deckId || '';
    
    let isPageReady = false;
    let app = new App();
    onMount(async () => {
        await app.init();
        await wordlist.init();
        app = app;
        isPageReady = true;
        nextCard();
    })
    
    let isComplete = false;
    let isDoneToday = false;
    let wordlist = new ChineseCharacterWordlist();
    const reviewButtonsLabel = ['Fail', 'Hard', 'Good', 'Easy'];
    
    let currentCardId: number | undefined = undefined;
    let scheduledTimeStr: Record<FSRS.Grade, string> = {1: '', 2: '', 3: '', 4: ''};
    function nextCard() {
        isComplete = false;
        const id = app.getNextCard(deckId);
        if (id == undefined) {
            // done for today
            isDoneToday = true;
            return;
        }
        const card = app.getCard(deckId, id);
        if (!card) return;
        currentCardId = id;
        scheduledTimeStr = app.getRatingScheduledTimeStr(deckId, id);
    }
    
    function characterWriterDataFromId(id: number): CharacterWriterData | undefined {
        const word = app.getCardWord(deckId, id);
        return wordlist.getCharacterWriterData(word);
    }
    function onComplete() {
        isComplete = true;
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
</script>


<TopBar title="Review" backUrl="{base}/"></TopBar>
<div class="container">
    {#if isDoneToday} 
        <div>You have done today's review.</div>
    {/if}
    {#if isPageReady && (currentCardId !== undefined) && !isDoneToday}
        <div class="character-writer-container">
            {#key currentCardId}
                <CharacterWriter app={app} characterData={characterWriterDataFromId(currentCardId)} onComplete={() => onComplete()} />
            {/key}
        </div>
        <div class="bottom-container">
            <div class="review-button-container">
                {#each reviewButtonsLabel as label, i}
                    <button 
                        class={`review-button ${getReviewButtonClass(i+1)}`} 
                        class:is-complete={isComplete}
                        onclick={() => onReviewButtonClick(i+1)}
                    >
                        <div class="review-button-inner">
                            <div class="review-time">{scheduledTimeStr[(i+1) as FSRS.Grade]}</div>
                            <div class="review-label">{label}</div>
                        </div>
                    </button>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
    }
    .character-writer-container {
        margin: 1em 0;
    }
    .bottom-container {
        position: absolute;
        bottom: 0;
        padding: 2em 2em 3em 2em;
        box-sizing: border-box;
        width: 100vw;
        @media (max-width: 600px) {
            padding-bottom: 1em;
        }
    }
    .review-button-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
    }
    .review-label {
        font-weight: bold;
        padding: 0.2em 2em;
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
</style>