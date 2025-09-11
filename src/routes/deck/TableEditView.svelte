<script lang="ts">
    import { App, WenBunCustomState } from "$lib/app";
    import { ChineseCharacterWordlist } from "$lib/chinese";
    import Loading from "$lib/components/Loading.svelte";
    import { DECK_TAGS } from "$lib/constants";
    import { isBuiltinDeck } from "$lib/util";
    import { onMount } from "svelte";
    import { SvelteMap, SvelteSet } from "svelte/reactivity";
    
    interface Props {
        app: App;
        deckId: string;
        isEditDeck: boolean;
        toggleSelection: (id: number) => void;
        selections: SvelteSet<number>;
    }
    let { 
        app, deckId, isEditDeck, toggleSelection, selections
    }: Props = $props();
    
    let wordlist = new ChineseCharacterWordlist();
    let isZhCantonese = $state(false);
    let isShowId = $state(false);
    let isInit = $state(false);
    let deckData = $state(app.deckData[deckId]);
    let lang = $derived(isZhCantonese ? 'yue' : 'zh') as 'zh' | 'yue';
    // let _refresh = $state(0);
    
    let accordionState = $state(new SvelteMap<string, boolean>());
    function toggleAccordion(id: string) {
        accordionState.set(id, !accordionState.get(id));
        accordionState = accordionState;
    }
    
    type EditType = 'reading' | 'meaning' | 'word';
    let editId = $state(-1);
    let editType: EditType = $state('reading');
    let originalEditStr = $state('');
    let editStr = $state('');
    function isEditing(id: number, typ: EditType) {
        return editId == id && editType == typ;
    }
    function startEditing(id: number, typ: EditType) {
        if (typ == 'reading') {
            editStr = wordlist.getReading(deckData.deck[id], lang);
            originalEditStr = editStr;
        } else if (typ == 'meaning') {
            editStr = wordlist.getMeaning(deckData.deck[id]);
            originalEditStr = editStr;
        } else if (typ == 'word') {
            editStr = deckData.deck[id];
            originalEditStr = editStr;
        }
        editId = id;
        editType = typ;
    }
    async function cancelEdit() {
        editId = -1;
    }
    async function saveEdit() {
        if (editStr !== originalEditStr) {
            if (editType == 'word') {
                if (editStr.trim().length > 0) {
                    app.modifyCardWord(deckId, editId, editStr);
                    await app.save();
                    refresh();
                } else {
                    window.alert('Word cannot be empty');
                }
            } else {
                app.setCustomEntry(deckId, editId, editStr, editType);
                await app.save();
                
                wordlist.resetCustomEntryDict();
                wordlist.registerCustomEntryDict(app.getCustomEntryDict(deckId));
            }
        }
        editId = -1;
    }
    
    function getIsUseExtraDict(tags: string[] | undefined): boolean {
        // due to backward compatibility, we need to manually make HSK7 deck to use extra dictionary 
        if (isBuiltinDeck(deckId) && deckId.startsWith('hsk7-v3.0')) return true;
        return !!tags?.includes(DECK_TAGS.ZH_EXTRA_DICT);
    }
    
    function addEmptyCard() {
        app.addEmptyCard(deckId);
        refresh();
    }
    
    function refresh() {
        deckData = app.deckData[deckId]; // refresh
    }
    
    onMount(async () => {
        const tags = app.deckData[deckId]?.tags;
        isZhCantonese = tags?.includes(DECK_TAGS.ZH_YUE);
        const isUseExtraDict = getIsUseExtraDict(tags);
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
                    <td class="selection"></td>
                    <td class="word">word</td>
                    <td class="reading">reading</td>
                    <td class="meaning">meaning</td>
                </tr>
            </thead>
            {#each deckData.groups as g}
                <tbody class="group-header">
                    <tr><td colspan="4"><button
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
                            <tr class:selected={selections.has(id)}>
                                <td class="id">{id}</td>
                                <td class="selection">
                                    <button class="edit-button" onclick={() => toggleSelection(id)}>
                                        {#if selections.has(id)}
                                            <i class="fa-solid fa-square-check"></i>
                                        {:else}
                                            <i class="fa-regular fa-square"></i>
                                        {/if}
                                    </button>
                                </td>
                                <td class="word">
                                    {#if isEditing(id, 'word')}
                                        <input type="text" style="width: 3em" bind:value={editStr}>
                                        <button onclick={() => saveEdit()} aria-label="save word" class="edit-button">
                                            <i class="fa-solid fa-square-check"></i>
                                        </button>
                                        <button onclick={() => cancelEdit()} aria-label="cancel edit" class="edit-button">
                                            <i class="fa-solid fa-square-xmark"></i>
                                        </button>
                                    {:else}
                                        <span class="chinese-font">
                                            {deckData.deck[id]}
                                        </span>
                                        <button onclick={() => startEditing(id, 'word')} aria-label="edit word" class="edit-button">
                                            <i class="fa-solid fa-pen-to-square"></i>
                                        </button>
                                    {/if}
                                </td>
                                <td class="reading">
                                    {#if isInit}
                                        {#if isEditing(id, 'reading')}
                                            <input type="text" bind:value={editStr} style="width: 5em">
                                            <button onclick={() => saveEdit()} aria-label="save reading" class="edit-button">
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
                                            <button onclick={() => saveEdit()} aria-label="save meaning" class="edit-button">
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
        <div style="margin-top: 1em;">
            <button class="button" onclick={() => addEmptyCard()}>Add New Empty Card</button>
        </div>
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
    tr.selected {
        background-color: var(--wenbun-blue);
        color: white !important;
        .not-custom {
            color: #FFF6;
        }
        .edit-button {
            color: white;
        }
    }
</style>