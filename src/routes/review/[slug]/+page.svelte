<script lang="ts">
    import { App } from "$lib/app";
    import CharacterWriter from "$lib/components/CharacterWriter.svelte";
    import * as FSRS from "ts-fsrs"
    import { onMount } from "svelte";
    import { type CharacterWriterData } from "$lib/util";
    import { ChineseCharacterWordlist } from "$lib/chinese";

    export let data: {slug?: string};
    let deckId = data.slug || '';
    
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
    let wordlist = new ChineseCharacterWordlist();
    const reviewButtonsLabel = ['Fail', 'Hard', 'Good', 'Easy'];
    
    let currentCardId: number | undefined = undefined;
    let scheduledTimeStr: Record<FSRS.Grade, string> = {1: '', 2: '', 3: '', 4: ''};
    function nextCard() {
        isComplete = false;
        const id = app.getNextCard(deckId);
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
</script>


<div class="container">
    {#if isPageReady && (currentCardId !== undefined)}
        <div class="character-writer-container">
            {#key currentCardId}
                <CharacterWriter characterData={characterWriterDataFromId(currentCardId)} onComplete={() => onComplete()} />
            {/key}
        </div>
        {#if isComplete}
            <div class="review-buttons-container">
                {#each reviewButtonsLabel as label, i}
                    <button class="review-button" onclick={() => onReviewButtonClick(i)}>
                        <div class="review-button-inner">
                            <span>{label}</span>
                            <span>{scheduledTimeStr[(i+1) as FSRS.Grade]}</span>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
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
    .review-button {
        all: unset;
        cursor: pointer;
        color: blue;
        padding: 0.5em 1em;
        border-radius: 0.5em;
    }
    .review-button:hover {
        background-color: lightgray;
    }
</style>