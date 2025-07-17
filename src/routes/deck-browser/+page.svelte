<script lang="ts">
    import { onMount } from "svelte";
    import { App } from "$lib/app";
    import { DeckInfo } from "$lib/constants";
    import TopBar from "$lib/components/TopBar.svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { loadDeck } from "$lib/util";
    
    type DeckData = {
        cardCount: number;
    }
    
    let app = new App();
    let deckDataMap: SvelteMap<string, DeckData> = new SvelteMap()
    let isLoaded = false;
    onMount(async () => {
        await app.init();
        await populateDeckDataMap();
        app = app;
        isLoaded = true;
    })
    
    async function populateDeckDataMap() {
      await Promise.allSettled(
        DeckInfo.map(async (info) => {
          const deck = await loadDeck(info.id);
          if (deck) {
            deckDataMap.set(info.id, { cardCount: deck.length });
          }
        })
      );
    }
    async function addDeck(deckId: string) {
        await app.addDeck(deckId);
        app = app;
    }
</script>

<TopBar title="Browse Decks" backUrl="/"></TopBar>
<div class="main-container">
    {#if isLoaded}
        <div class="deck-list-container">
            {#each DeckInfo as info}
                <div class="deck-card-container">
                    <div class="deck-card">
                        <div class="left">
                            <span class="deck-card-title">{info.title}</span>
                            <span class="deck-card-subtitle">{info.subtitle}</span>
                        </div>
                        <div class="right">
                            <span class="deck-card-count">{deckDataMap.get(info.id)?.cardCount ?? 0} cards</span>
                        </div>
                    </div>
                    {#if !app.decks.includes(info.id)}
                        <button class="deck-add-button" onclick={() => addDeck(info.id)}>+</button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
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
        flex-direction: column;
        align-items: start;
        justify-content: center;
        gap: 1em;
    }
    .deck-card-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.8em;
    }
    .deck-card {
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
        .deck-card-count {
            color: #3E92CC;
        }
    }
    .deck-add-button {
        all: unset;
        background-color: #3E92CC;
        color: white;
        border-radius: 0.5em;
        padding: 0.5em 0.8em;
        cursor: pointer;
        opacity: 1;
        &:hover {
            opacity: 0.6;
        }
    }
</style>