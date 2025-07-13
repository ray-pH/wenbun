<script lang="ts">
    import { get } from "svelte/store";
    import { profileStore } from "../../../stores/stores";
    import CharacterWriter from "../../../components/CharacterWriter.svelte";
    import * as FSRS from "ts-fsrs"
    import { onMount } from "svelte";
    import { dateDiffFormatted, type CharacterWriterData } from "$lib/util";
    import { ChineseCharacterWordlist } from "$lib/chinese";

    export let data: {slug?: string};
    let deckId = data.slug || '';
    let profile = get(profileStore);
    let deckData = profile.deckData[deckId];
    let groups = deckData.groups;
    let cards = Object.values(groups).flat();
    
    let isComplete = false;
    let isWordlistReady = false;
    let wordlist = new ChineseCharacterWordlist();
    const reviewButtonsLabel = ['Fail', 'Hard', 'Good', 'Easy'];
    
    // TODO: load from profile
    const params = FSRS.generatorParameters()
    const fsrs: FSRS.FSRS = new FSRS.FSRS(params);
    
    let currentCard: string;
    let schedulingCards: FSRS.RecordLog;
    let scheduledTimeStr: string[] = [];
    
    onMount(() => {
        wordlist.init().then(() => {
            isWordlistReady = true;
            currentCard = getNextCard();
        })
    })
    
    // TODO: move these functions to profileService
    function getNextCard() {
        // TODO: check schedule
        return getNewCard();
    }
    function getNewCard() {
        const unusedCards = cards.filter((s) => !deckData.schedule[s])
        let id = unusedCards[0];
        let card = FSRS.createEmptyCard();
        deckData.schedule[id] = card;
        profileStore.set(profile);
        schedulingCards = fsrs.repeat(card, new Date());
        updateScheduledDays(schedulingCards);
        return id;
    }
    function updateScheduledDays(schedulingCards: FSRS.RecordLog) {
        for (let i = 1; i <= 4; i++) {
            const now = schedulingCards[i as FSRS.Grade].log.due;
            const due = schedulingCards[i as FSRS.Grade].card.due;
            scheduledTimeStr[i] = dateDiffFormatted(now, due);
        }
    }
    function characterWriterDataFromId(id: string): CharacterWriterData | undefined {
        // TODO: separate characters from id
        return wordlist.getCharacterWriterData(id);
    }
    function onComplete() {
        getNextCard();
        isComplete = true;
    }
</script>


<div class="container">
    {#if isWordlistReady && currentCard}
        <div class="character-writer-container">
            <CharacterWriter characterData={characterWriterDataFromId(currentCard)} onComplete={() => onComplete()} />
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