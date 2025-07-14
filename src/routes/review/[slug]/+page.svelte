<script lang="ts">
    import { App } from "$lib/app";
    import CharacterWriter from "../../../components/CharacterWriter.svelte";
    import * as FSRS from "ts-fsrs"
    import { onMount } from "svelte";
    import { dateDiffFormatted, type CharacterWriterData } from "$lib/util";
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
    
    // TODO: load from profile
    const params = FSRS.generatorParameters()
    const fsrs: FSRS.FSRS = new FSRS.FSRS(params);
    
    let currentCardId: number | undefined = undefined;
    let scheduledTimeStr: string[] = [];
    
    function nextCard() {
        const id = app.getNextCard(deckId);
        const card = app.getCard(deckId, id);
        if (!card) return;
        const schedulingCards = fsrs.repeat(card, new Date());
        currentCardId = id;
        updateScheduledDays(schedulingCards);
    }
    
    function updateScheduledDays(schedulingCards: FSRS.RecordLog) {
        for (let i = 1; i <= 4; i++) {
            const now = schedulingCards[i as FSRS.Grade].log.due;
            const due = schedulingCards[i as FSRS.Grade].card.due;
            scheduledTimeStr[i] = dateDiffFormatted(now, due);
        }
    }
    function characterWriterDataFromId(id: number): CharacterWriterData | undefined {
        const word = app.getCardWord(deckId, id);
        return wordlist.getCharacterWriterData(word);
    }
    function onComplete() {
        isComplete = true;
    }
</script>


<div class="container">
    {#if isPageReady && (currentCardId !== undefined)}
        <div class="character-writer-container">
            <CharacterWriter characterData={characterWriterDataFromId(currentCardId)} onComplete={() => onComplete()} />
        </div>
        <!-- {#if isComplete} -->
            <div class="review-buttons-container">
                {#each reviewButtonsLabel as label, i}
                    <button class="review-button">
                        <div class="review-button-inner">
                            <span>{label}</span>
                            <span>{scheduledTimeStr[i+1]}</span>
                        </div>
                    </button>
                {/each}
            </div>
        <!-- {/if} -->
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