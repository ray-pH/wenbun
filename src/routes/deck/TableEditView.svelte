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
    
    let editId = $state(-1);
    let editType: 'reading' | 'meaning' = $state('reading');
    let originalEditStr = $state('');
    let editStr = $state('');
    function isEditing(id: number, typ: 'reading' | 'meaning') {
        return editId == id && editType == typ;
    }
    function startEditing(id: number, typ: 'reading' | 'meaning') {
        if (typ == 'reading') {
            editStr = wordlist.getReading(deckData.deck[id], lang);
            originalEditStr = editStr;
        } else if (typ == 'meaning') {
            editStr = wordlist.getMeaning(deckData.deck[id]);
            originalEditStr = editStr;
        }
        editId = id;
        editType = typ;
    }
    async function stopEditing() {
        if (editStr !== originalEditStr) {
            app.setCustomEntry(deckId, editId, editStr, editType);
            await app.save();
            
            wordlist.resetCustomEntryDict();
            wordlist.registerCustomEntryDict(app.getCustomEntryDict(deckId));
        }
        editId = -1;
    }
    
    onMount(async () => {
        const tags = app.deckData[deckId]?.tags;
        isZhCantonese = tags?.includes(DECK_TAGS.ZH_YUE);
        const isUseExtraDict = tags?.includes(DECK_TAGS.ZH_EXTRA_DICT);
        await wordlist.init(lang, isUseExtraDict);
        wordlist.registerCustomEntryDict(app.getCustomEntryDict(deckId));
        isInit = true;
        for (const g of deckData.groups) accordionState.set(g.label, true);
    })
</script>

<div>
</div>
<div class="table-container">
    {#if isEditDeck}
        <table class:is-show-id={isShowId}>
            <thead>
                <tr>
                    <td class="id">id</td>
                    <td class="word">word</td>
                    <td class="reading">reading</td>
                    <td class="meaning">meaning</td>
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
                                        {#if isEditing(id, 'reading')}
                                            <input type="text" bind:value={editStr}>
                                            <button onclick={() => stopEditing()} aria-label="save reading" class="edit-button">
                                                <i class="fa-solid fa-square-check"></i>
                                            </button>
                                        {:else}
                                            <span class:not-custom={!wordlist.isCustomEntry(deckData.deck[id]).reading}>
                                                {wordlist.getReading(deckData.deck[id], lang)}
                                            </span>
                                            <button onclick={() => startEditing(id, 'reading')} aria-label="edit reading" class="edit-button">
                                                <i class="fa-solid fa-pen-to-square"></i>
                                            </button>
                                        {/if}
                                    {:else}
                                        <Loading/>
                                    {/if}
                                </td>
                                <td class="meaning">
                                    {#if isInit}
                                        {#if isEditing(id, 'meaning')}
                                            <textarea bind:value={editStr}></textarea>
                                            <button onclick={() => stopEditing()} aria-label="save meaning" class="edit-button">
                                                <i class="fa-solid fa-square-check"></i>
                                            </button>
                                        {:else}
                                            <span class:not-custom={!wordlist.isCustomEntry(deckData.deck[id]).meaning}>
                                                {wordlist.getMeaning(deckData.deck[id])}
                                            </span>
                                            <button onclick={() => startEditing(id, 'meaning')} aria-label="edit reading" class="edit-button">
                                                <i class="fa-solid fa-pen-to-square"></i>
                                            </button>
                                        {/if}
                                    {:else}
                                        <Loading/>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                {/if}
            {/each}
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
                                        {wordlist.getMeaning(deckData.deck[id])}
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
        width: 96vw;
        max-width: 34em;
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
    .not-custom {
        color: #0006;
    }
    .edit-button {
        all: unset;
        color: gray;
        cursor: pointer;
        &:hover {
            color: black;
        }
    }
</style>