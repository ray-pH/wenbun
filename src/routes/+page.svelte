<script lang="ts">
    import { onMount } from "svelte";
    import CharacterWriter from "../components/CharacterWriter.svelte";
    import { ProfileService, type Profile } from "../lib/profile";
    import { profileStore } from "../stores/stores";
    
    // debug
    let profile: Profile = {
        decks: ['old-hsk1'],
        deckData: {}
    }
    profileStore.set(profile);
    let profileService = new ProfileService(profileStore);
    
    onMount(async () => {
        profile.decks.forEach(deckId => {
            // TODO: do this somewhere else
            profileService.ensureProfileDeckData(deckId).then(() => {
                profileService.processTodaySchedule();
            });
        });
    })
    
    let activeDeckIds: string[] = profile.decks;
    
</script>

<main class="container">
    <!-- <CharacterWriter /> -->
    <div class="deck-list-container">
    </div>
    {#each activeDeckIds as deckId}
        <div class="deck-card-container">
            <a class="deck-card" href="/review/{deckId}">
                {deckId}
            </a>
            <a class="deck-card-button" href="/deck/{deckId}">
                B
            </a>
        </div>
    {/each}
</main>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
    }
    .deck-list-container {
        display: flex;
        flex-direction: row;
    }
    .deck-card-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5em;
    }
    .deck-card {
        all: unset;
        color: white;
        background-color: #3E92CC;
        border-radius: 0.5em;
        width: 20em;
        height: 2em;
        padding: 0.5em;
    }
    .deck-card-button {
        all: unset;
        color: white;
        background-color: #3E92CC;
        border-radius: 0.5em;
        width: 2.5em;
        height: 2.5em;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
