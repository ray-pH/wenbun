<script lang="ts">
    import { base } from '$app/paths';
    import { onMount } from "svelte";
    import { App } from "$lib/app";
    import { DeckFilters, DeckInfo } from "$lib/constants";
    import TopBar from "$lib/components/TopBar.svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { loadDeck } from "$lib/util";
    
    type DeckData = {
        cardCount: number;
    }
    
    let app = new App();
    let deckDataMap: SvelteMap<string, DeckData> = new SvelteMap()
    let isLoaded = false;
    let filterText = "";
    let filteredDeckInfo = DeckInfo;
    onMount(async () => {
        await app.init();
        initComponent();
        const changed = await app.initProfile();
        if (changed) initComponent();
    })
    
    async function initComponent() {
        await populateDeckDataMap();
        app = app;
        isLoaded = true;
    }
    
    async function populateDeckDataMap() {
      await Promise.allSettled(
        DeckInfo.map(async (info) => {
          const deck = await loadDeck(info.src ?? `${info.id}.txt`);
          if (deck) {
            deckDataMap.set(info.id, { cardCount: deck.length });
          }
        })
      );
    }
    async function addDeck(deckId: string) {
        await app.addDeckById(deckId);
        app = app;
    }
    
    function filter(filterText: string) {
        if (!filterText.trim()) {
            filteredDeckInfo = DeckInfo;
        } else {
            filteredDeckInfo = DeckInfo.filter((info) => {
                const str = `${info.title} ${info.subtitle}`.toLowerCase();
                return str.includes(filterText.toLowerCase());
            });
        }
    }
</script>

<TopBar title="Browse Decks"></TopBar>
<div class="main-container">
    {#if isLoaded}
        <div class="top-container">
            <div class="filter-container">
                <span class="filter-label">Filter:</span>
                <select class="filter-select" bind:value={filterText} onchange={() => filter(filterText)}>
                    <option value=""></option>
                    {#each DeckFilters as filter}
                        <option value={filter}>{filter}</option>
                    {/each}
                </select>
            </div>
        </div>
        {#if filterText.trim() === ''}
            <div class="custom-deck-upload-container">
                <a class="button upload-deck-button" href="{base}/upload-custom-deck">
                    <i class="fa-solid fa-file-import"></i>&nbsp;
                    Upload custom deck
                </a>
            </div>
        {/if}
        <div class="deck-list-container">
            {#each filteredDeckInfo as info}
                <div class="deck-card-container">
                    <div class="deck-card">
                        <div class="left">
                            <span class="deck-card-title">{info.title}</span>
                            <span 
                                class="deck-card-subtitle"
                                style={`--subtitle-color: ${info.color ?? '#00000080'}`}
                            >
                                {info.subtitle}
                            </span>
                        </div>
                        <div class="right">
                            <span class="deck-card-count">{deckDataMap.get(info.id)?.cardCount ?? 0} cards</span>
                        </div>
                    </div>
                    <button 
                        class="deck-add-button" class:invisible={app.decks.includes(info.id)}
                        onclick={() => addDeck(info.id)} title="Add deck" aria-label="Add deck"
                    >
                        <i class="fa-solid fa-plus"></i>
                    </button>
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
        padding-top: 1em;
    }
    .top-container {
        margin-bottom: 1em;
    }
    .filter-select {
        padding: 0.5em;
        border-radius: 0.5em;
    }
    .deck-list-container {
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: center;
        gap: 1em;
    }
    .deck-card-container {
        width: 90vw;
        max-width: 30em;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.8em;
    }
    .deck-card {
        background-color: #FFFFFF90;
        border-radius: 0.5em;
        box-sizing: border-box;
        padding: 1em;
        display: flex;
        flex-grow: 1;
        align-items: center;
        justify-content: space-between;
        gap: 1em;
        
        .deck-card-title {
            font-weight: bold;
        }
        .deck-card-subtitle {
            padding-left: 0.2em;
            color: var(--subtitle-color, #00000080);
            font-size: 0.9em;
        }
        .deck-card-count {
            color: var(--wenbun-blue);
        }
        .right {
            text-align: right;
        }
    }
    .deck-add-button {
        all: unset;
        background-color: var(--wenbun-blue);
        color: white;
        border-radius: 0.5em;
        padding: 0.5em 0.8em;
        cursor: pointer;
        opacity: 1;
        &:hover {
            opacity: 0.6;
        }
        &.invisible {
            opacity: 0;
        }
    }
    .custom-deck-upload-container {
        margin-bottom: 1em;
    }
    .upload-deck-button {
        width: 90vw;
        max-width: 30em;
        padding: 1em;
    }
</style>