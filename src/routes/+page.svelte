<script lang="ts">
    import { onMount } from "svelte";
    import { App } from "$lib/app";
    import TopBar from "$lib/components/TopBar.svelte";
    
    let app = new App();
    $: activeDeckIds = Object.keys(app.deckData);
    onMount(async () => {
        await app.init();
        app = app;
    })
    
</script>

<TopBar title="WenBun"></TopBar>
<div class="main-container">
    <div class="top-container">
        <a class="a-button" href="/deck-browser/">Add New Deck</a>
    </div>
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
    :global(body) {
        max-width: 100vw;
        overflow-x: hidden;
        margin: 0;
        padding: 0;
        background-color: #E0E0E0;
    }
    .main-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        margin: 1em 0;
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
    .top-container {
        margin: 2em;
    }
    .a-button {
        all: unset;
        display: block;
        background-color: #FFFFFF90;
        width: 20em;
        border-radius: 0.5em;
        padding: 1em;
    }
</style>
