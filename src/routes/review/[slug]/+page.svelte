<script lang="ts">
    import { get } from "svelte/store";
    import { profileStore } from "../../../stores/stores";
    import CharacterWriter from "../../../components/CharacterWriter.svelte";
    import * as FSRS from "ts-fsrs"
    import { onMount } from "svelte";
    import type { CharacterWriterData } from "$lib/util";
    import { ChineseCharacterWordlist } from "$lib/chinese";

    export let data: {slug?: string};
    let deckId = data.slug || '';
    let profile = get(profileStore);
    let deckData = profile.deckData[deckId];
    let groups = deckData.groups;
    let cards = Object.values(groups).flat();
    
    let isWordlistReady = false;
    let wordlist = new ChineseCharacterWordlist();
    
    let currentCard: string;
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
        return id;
    }
    function characterWriterDataFromId(id: string): CharacterWriterData | undefined {
        // TODO: separate characters from id
        return wordlist.getCharacterWriterData(id);
    }
    function onComplete() {
        getNextCard();
    }
</script>


<div class="container">
    {#if isWordlistReady && currentCard}
        <div class="character-writer-container">
            <CharacterWriter characterData={characterWriterDataFromId(currentCard)} onComplete={() => onComplete()} />
        </div>
    {/if}
</div>

<style>
    .character-writer-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
    }
</style>