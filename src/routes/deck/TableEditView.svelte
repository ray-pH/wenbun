<script lang="ts">
    import { App, WenBunCustomState } from "$lib/app";
    import { ChineseCharacterWordlist } from "$lib/chinese";
    import Loading from "$lib/components/Loading.svelte";
    import { DECK_TAGS } from "$lib/constants";
    import { onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    
    interface Props {
        app: App;
        deckId: string;
        isEditDeck: boolean;
    }
    let { 
        app, deckId, isEditDeck
    }: Props = $props();
    
    let wordlist = new ChineseCharacterWordlist();
    let isZhCantonese = $state(false);
    let isShowId = $state(false);
    let isInit = $state(false);
    let deckData = app.deckData[deckId];
    let lang = $derived(isZhCantonese ? 'yue' : 'zh') as 'zh' | 'yue';
    
    let accordionState = $state(new SvelteMap<string, boolean>());
    function toggleAccordion(id: string) {
        accordionState.set(id, !accordionState.get(id));
        accordionState = accordionState;
    }
    
    onMount(async () => {
        const tags = app.deckData[deckId]?.tags;
        isZhCantonese = tags?.includes(DECK_TAGS.ZH_YUE);
        const isUseExtraDict = tags?.includes(DECK_TAGS.ZH_EXTRA_DICT);
        await wordlist.init(lang, isUseExtraDict);
        isInit = true;
        for (const g of deckData.groups) accordionState.set(g.label, true);
    })
</script>

<div>
</div>
<div class="table-container">
    {#if isEditDeck}
        <table>
        </table>
    {:else}
        <table class:is-show-id={isShowId}>
            <thead>
                <tr>
                    <td class="id">id</td>
                    <td class="word">word</td>
                    <td class="reading">reading</td>
                    <td class="meaning">meaning</td>
                    <td class="due">due</td>
                </tr>
            </thead>
            {#each deckData.groups as g}
                <tbody class="group-header">
                    <tr><td colspan="3"><button
                            class="accordion-button"
                            onclick={() => toggleAccordion(g.label)}
                        >
                        {g.label}
                        {#if accordionState.get(g.label)}
                            <i class="fa-solid fa-chevron-down"></i>
                        {:else}
                            <i class="fa-solid fa-chevron-right"></i>
                        {/if}
                    </button></td></tr>
                </tbody>
                {#if accordionState.get(g.label)}
                    <tbody>
                        {#each g.cardIds as id}
                            <tr>
                                <td class="id">{id}</td>
                                <td class="word chinese-font">{deckData.deck[id]}</td>
                                <td class="reading">
                                    {#if isInit}
                                        {wordlist.getReading(deckData.deck[id], lang)}
                                    {:else}
                                        <Loading/>
                                    {/if}
                                </td>
                                <td class="meaning">
                                    {#if isInit}
                                        {wordlist.getWordData(deckData.deck[id])?.meaning}
                                    {:else}
                                        <Loading/>
                                    {/if}
                                </td>
                                <td class="due small">
                                    {app.getShortCardDueFormatted(deckId, id)}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                {/if}
            {/each}
        </table>
    {/if}
</div>

<style>
    table:not(.is-show-id) {
        .id {
            display: none;
        }
    }
    table {
        border-collapse: separate;
        border-radius: 0.5rem;
        overflow: hidden;
        border-spacing: 0;
        td {
            padding: 0.2em 0.7em;
        }
    }
    table .meaning {
        max-width: 15em;
    }
    thead td{
        background-color: white !important;
    }
    tr:nth-child(odd) > td {
        background-color: #FFFFFF50;
    }
    .chinese-font {
        font-size: 1.2em;
    }
    .group-header {
        td {
            background-color: unset !important;
        }
    }
    .accordion-button {
        all: unset;
        padding: 0.7em 0;
        cursor: pointer;
        &:hover {
            opacity: 0.5;
        }
    }
    .due.small {
        font-size: 0.8em;
    }
</style>