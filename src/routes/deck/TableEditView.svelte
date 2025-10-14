<script lang="ts">
    import { App, type Lang } from "$lib/app";
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
    let lang = $derived(isZhCantonese ? 'yue' : 'zh') as Lang;
    // let _refresh = $state(0);
    
    let accordionState = $state(new SvelteMap<string, boolean>());
    
    function toggleAccordion(id: string) {
        accordionState.set(id, !accordionState.get(id));
    }
    
    function isAccordionOpen(id: string): boolean {
        return accordionState.get(id) ?? false;
    }

    /* Start of sorting logic */
    type SortColumn = 'id' | 'word' | 'reading' | 'meaning' | 'due' | null;
    let sortColumn: SortColumn = $state(null);
    let sortAscending = $state(true);
    
    function toggleSort(column: SortColumn) {
        if (sortColumn === column) {
            sortAscending = !sortAscending;
        } else {
            sortColumn = column;
            sortAscending = true;
        }
    }
    
    function getSortedCardIds(cardIds: number[]): number[] {
        if (!sortColumn || !isInit) return cardIds;
        
        return [...cardIds].sort((a, b) => {
            let valA: string | number;
            let valB: string | number;
            
            switch (sortColumn) {
                case 'id':
                    valA = a;
                    valB = b;
                    break;
                case 'word':
                    valA = deckData.deck[a] || '';
                    valB = deckData.deck[b] || '';
                    break;
                case 'reading':
                    valA = wordlist.getReading(deckData.deck[a], lang).toLowerCase();
                    valB = wordlist.getReading(deckData.deck[b], lang).toLowerCase();
                    break;
                case 'meaning':
                    valA = wordlist.getMeaning(deckData.deck[a]).toLowerCase();
                    valB = wordlist.getMeaning(deckData.deck[b]).toLowerCase();
                    break;
                case 'due':
                    valA = app.getCardDue(deckId, a)?.getTime() || 0;
                    valB = app.getCardDue(deckId, b)?.getTime() || 0;
                    break;
                default:
                    return 0;
            }
            
            // Use localeCompare for strings to ignore accents
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortAscending
                    ? valA.localeCompare(valB, undefined, { sensitivity: 'base' })
                    : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
            }

            // Numeric comparison
            const diff = valA < valB ? -1 : valA > valB ? 1 : 0;
            return sortAscending ? diff : -diff;
        });
    }
    
    function getSortIcon(column: SortColumn): string {
        if (sortColumn !== column) return 'fa-sort';
        return sortAscending ? 'fa-sort-up' : 'fa-sort-down';
    }
    /* End of sorting logic */
    
    type EditType = 'reading' | 'meaning' | 'word';
    let editId = $state(-1);
    let editType: EditType = $state('reading');
    let originalEditStr = $state('');
    let editStr = $state('');
    
    function isEditing(id: number, typ: EditType) {
        return editId === id && editType === typ;
    }
    
    function getEditValue(id: number, typ: EditType): string {
        switch (typ) {
            case 'reading': return wordlist.getReading(deckData.deck[id], lang);
            case 'meaning': return wordlist.getMeaning(deckData.deck[id]);
            case 'word': return deckData.deck[id];
        }
    }
    
    function startEditing(id: number, typ: EditType) {
        editStr = originalEditStr = getEditValue(id, typ);
        editId = id;
        editType = typ;
    }
    
    function cancelEdit() {
        editId = -1;
    }
    
    async function saveEdit() {
        if (editStr === originalEditStr) {
            editId = -1;
            return;
        }
        
        if (editType === 'word') {
            if (editStr.trim().length > 0) {
                app.modifyCardWord(deckId, editId, editStr);
                await app.save();
            } else {
                window.alert('Word cannot be empty');
                return;
            }
        } else {
            app.setCustomEntry(deckId, editId, editStr, editType);
            await app.save();
            
            wordlist.resetCustomEntryDict();
            wordlist.registerCustomEntryDict(app.getCustomEntryDict(deckId));
        }
        refresh();
        
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

{#snippet tableHeader(columns: Array<{key: SortColumn, label: string}>)}
    <thead>
        <tr>
            {#each columns as col}
                <td class="{col.key} {col.key ? 'clickable' : ''}" onclick={() => col.key && toggleSort(col.key)}>
                    {col.label} 
                    {#if col.key}
                        <i class="fa-solid {getSortIcon(col.key)}"></i>
                    {/if}
                </td>
            {/each}
        </tr>
    </thead>
{/snippet}

{#snippet groupHeader(label: string)}
    <tbody class="group-header">
        <tr><td colspan="5"><button
                class="accordion-button"
                onclick={() => toggleAccordion(label)}
            >
            {label}
            <i class="fa-solid fa-chevron-{isAccordionOpen(label) ? 'down' : 'right'}"></i>
        </button></td></tr>
    </tbody>
{/snippet}

{#snippet editableCell(id: number, typ: EditType, displayValue: string, isCustom: boolean, inputStyle?: string)}
    {#if isInit}
        {#if isEditing(id, typ)}
            {#if typ === 'meaning'}
                <textarea bind:value={editStr}></textarea>
            {:else}
                <input type="text" bind:value={editStr} style={inputStyle}>
            {/if}
            <button onclick={() => saveEdit()} aria-label="save {typ}" class="edit-button">
                <i class="fa-solid fa-square-check"></i>
            </button>
            {#if typ === 'word'}
                <button onclick={() => cancelEdit()} aria-label="cancel edit" class="edit-button">
                    <i class="fa-solid fa-square-xmark"></i>
                </button>
            {/if}
        {:else}
            <span class:not-custom={!isCustom} class:chinese-font={typ === 'word'}>
                {displayValue}
            </span>
            <button onclick={() => startEditing(id, typ)} aria-label="edit {typ}" class="edit-button">
                <i class="fa-solid fa-pen-to-square"></i>
            </button>
        {/if}
    {:else}
        <Loading/>
    {/if}
{/snippet}

<div>
</div>
<div class="table-container">
    {#if isEditDeck}
        <table class:is-show-id={isShowId}>
            {@render tableHeader([
                {key: 'id', label: 'id'},
                {key: null, label: ''},
                {key: 'word', label: 'word'},
                {key: 'reading', label: 'reading'},
                {key: 'meaning', label: 'meaning'}
            ])}
            {#each deckData.groups as g}
                {@render groupHeader(g.label)}
                {#if isAccordionOpen(g.label)}
                    <tbody>
                        {#each getSortedCardIds(g.cardIds) as id}
                            <tr class:selected={selections.has(id)}>
                                <td class="id">{id}</td>
                                <td class="selection">
                                    <button class="edit-button" onclick={() => toggleSelection(id)} aria-label="toggle selection">
                                        <i class="fa-solid fa-{selections.has(id) ? 'square-check' : 'regular fa-square'}"></i>
                                    </button>
                                </td>
                                <td class="word">
                                    {@render editableCell(id, 'word', deckData.deck[id], true, 'width: 3em')}
                                </td>
                                <td class="reading">
                                    {@render editableCell(id, 'reading', wordlist.getReading(deckData.deck[id], lang), wordlist.isCustomEntry(deckData.deck[id]).reading, 'width: 5em')}
                                </td>
                                <td class="meaning">
                                    {@render editableCell(id, 'meaning', wordlist.getMeaning(deckData.deck[id]), wordlist.isCustomEntry(deckData.deck[id]).meaning)}
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
            {@render tableHeader([
                {key: 'id', label: 'id'},
                {key: 'word', label: 'word'},
                {key: 'reading', label: 'reading'},
                {key: 'meaning', label: 'meaning'},
                {key: 'due', label: 'due'}
            ])}
            {#each deckData.groups as g}
                {@render groupHeader(g.label)}
                {#if isAccordionOpen(g.label)}
                    <tbody>
                        {#each getSortedCardIds(g.cardIds) as id}
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
        font-weight: 600;
    }
    thead td.clickable {
        cursor: pointer;
        user-select: none;
        transition: background-color 0.2s;
    }
    thead td.clickable:hover {
        background-color: #f0f0f0 !important;
    }
    thead td.clickable i {
        font-size: 0.8em;
        margin-left: 0.2em;
        color: #999;
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