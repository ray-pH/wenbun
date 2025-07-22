<script lang="ts">
    import { onMount } from "svelte";
    import { App } from "$lib/app";
    import TopBar from "$lib/components/TopBar.svelte";
    import { DeckInfo } from "$lib/constants";
    
    let app = new App();
    $: activeDeckIds = Object.keys(app.deckData);
    onMount(async () => {
        await app.init();
        app = app;
    })
    
    function getDeckInfo(deckId: string): typeof DeckInfo[number] {
        return DeckInfo.find((s) => s.id === deckId) ?? { id: deckId, title: deckId, subtitle: ''};
    }
</script>

<TopBar title="WenBun"></TopBar>
<div class="main-container">
    <div class="top-container">
        <a class="a-button" href="/deck-browser/">Add New Deck</a>
    </div>
    <div class="hr"></div>
    <div class="deck-list-container">
        {#each activeDeckIds as deckId}
            <div class="deck-card-container">
                {@render deckCard(getDeckInfo(deckId))}
                <a class="deck-card-button" href="/deck/{deckId}" title="Deck Info" aria-label="Deck Info">
                    <i class="fa-solid fa-list"></i>
                </a>
            </div>
        {/each} 
    </div> 
</div>

{#snippet deckCard(info: typeof DeckInfo[number])}
    <a class="deck-card" href="/review/{info.id}">
        <div class="left">
            <span class="deck-card-title">{info.title}</span>
            <span class="deck-card-subtitle">{info.subtitle}</span>
        </div>
        <div class="right">
            <span class="deck-count-learn-relearn">
                {app.getLearningRelearningCardsCount(info.id) || ''}
            </span>
            <span class="deck-count-review">
                {app.getScheduledReviewCardsCount(info.id) || ''}
            </span>
            <span class="deck-count-new">
                {app.getScheduledNewCardsCount(info.id) || ''}
            </span>
            <span class="deck-count-previously-studied">
                {app.getPreviouslyStutedCardsCount(info.id) || ''}
            </span>
        </div>
    </a>
{/snippet}

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
    .hr {
        width: 20em;
        height: 1px;
        background-color: #00000090;
    }
    .deck-list-container {
        display: flex;
        flex-direction: column;
        gap: 1em;
        margin-top: 2em;
    }
    .deck-card-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5em;
    }
    .deck-card {
        all: unset;
        /* background-color: #3E92CC; */
        /* background-color: #FFFFFF90;
        border-radius: 0.5em;
        width: 20em;
        height: 2em;
        padding: 0.5em; */
        
        background-color: #FFFFFF90;
        border-radius: 0.5em;
        width: 20em;
        padding: 1em;
        display: flex;
        align-items: center;
        justify-content: space-between;
        
        .deck-card-title {
            font-weight: bold;
        }
        .deck-card-subtitle {
            color: #00000080;
            font-size: 0.9em;
        }
        .right {
            color: #3E92CC;
        }
    }
    .deck-card {
        .right {
            display: grid;
            gap: 0.5em;
            grid-template-columns: 1.5em 1.5em 1.5em 1.5em;
            .deck-count-learn-relearn {
                place-self: center;
                color: #DB6B6C
            }
            .deck-count-review {
                place-self: center;
                color: #419E6F
            }
            .deck-count-new {
                place-self: center;
                color: #3E92CC;
            }
            .deck-count-previously-studied {
                place-self: center;
                color: #DA8C22;
            }
        }
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
        cursor: pointer;
    }
</style>
