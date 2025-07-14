<script lang="ts">
    import { onMount } from "svelte";
    import { App } from "$lib/app";
    
    let app = new App();
    $: activeDeckIds = Object.keys(app.deckData);
    onMount(async () => {
        await app.init();
        app = app;
    })
    
</script>

<div class="main-container">
    <div class="deck-list-container">
    </div>
    {#each activeDeckIds as deckId}
        <div class="deck-card-container">
            <a class="deck-card" href="/review/{deckId}">
                {deckId}
                {app.deckData[deckId]?.scheduledNewCardCount}
            </a>
            <a class="deck-card-button" href="/deck/{deckId}">
                B
            </a>
        </div>
    {/each}
</div>

<style>
    .main-container {
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
