<script lang="ts">
    import { App, type Lang } from "$lib/app";
    import { ChineseCharacterWordlist } from "$lib/chinese";
    import Loading from "$lib/components/Loading.svelte";
    import { DECK_TAGS } from "$lib/constants";
    import { isBuiltinDeck } from "$lib/util";
    import { onMount } from "svelte";
    import { SvelteMap, SvelteSet } from "svelte/reactivity";
    import Page from "../upload-custom-deck/help/+page.svelte";
    import TopRevealBar from "$lib/components/TopRevealBar.svelte";
    
    interface Props {
        app: App;
        deckId: string;
        isEditDeck: boolean;
        toggleSelection: (id: number) => void;
        selections: SvelteSet<number>;
        accordionState?: SvelteMap<string, boolean>;
        filterIds?: number[];
        standaloneBulkEdit?: boolean;
        onBulkEditDone?: () => void;
    }
    let { 
        app, deckId, isEditDeck, toggleSelection, selections, 
        standaloneBulkEdit = false,
        accordionState = new SvelteMap(), filterIds = [],
        onBulkEditDone = () => {}
    }: Props = $props();

    let wordlist = new ChineseCharacterWordlist();
    let isZhCantonese = $state(false);
    let isShowId = $state(false);
    let isInit = $state(false);
    let isBulkEdit = $state(false);
    let deckData = $state(app.deckData[deckId]);
    let lang = $derived(isZhCantonese ? 'yue' : 'zh') as Lang;
    // let _refresh = $state(0);
    
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
    let originalBulkEditValues = new SvelteMap<string, string>();
    let defaultBulkEditValues = new SvelteMap<string, string>();
    let bulkEditValues: SvelteMap<string, string> = $state(new SvelteMap());
    
    function isEditing(id: number, typ: EditType) {
        return editId === id && editType === typ;
    }
    
    function getEditValue(id: number, typ: EditType, ignoreCustomEntry: boolean = false): string {
        switch (typ) {
            case 'reading': return wordlist.getReading(deckData.deck[id], lang, undefined, ignoreCustomEntry);
            case 'meaning': return wordlist.getMeaning(deckData.deck[id], ignoreCustomEntry);
            case 'word': return deckData.deck[id];
        }
    }
    
    function startEditing(id: number, typ: EditType) {
        editStr = originalEditStr = getEditValue(id, typ);
        editId = id;
        editType = typ;
    }
    
    function getDeckDataGroups(): typeof deckData.groups {
        if (filterIds.length === 0) return deckData.groups;
        else {
            return [{label: "filtered", cardIds: filterIds}]
        }
    }
    
    function bulkEditStart() {
        isBulkEdit = true;
        const ids = getDeckDataGroups().flatMap(g => g.cardIds);
        bulkEditValues.clear();
        originalBulkEditValues.clear();
        for (const id of ids) {
            const isCustomEntry = wordlist.isCustomEntry(deckData.deck[id]);
            const reading = isCustomEntry.reading ? getEditValue(id, 'reading') : '';
            const meaning = isCustomEntry.meaning ? getEditValue(id, 'meaning') : '';
            
            bulkEditValues.set(`${id}-reading`, reading);
            bulkEditValues.set(`${id}-meaning`, meaning);
            originalBulkEditValues.set(`${id}-reading`, reading);
            originalBulkEditValues.set(`${id}-meaning`, meaning);
            
            const defaultReading = getEditValue(id, 'reading', true);
            const defaultMeaning = getEditValue(id, 'meaning', true);
            defaultBulkEditValues.set(`${id}-reading`, defaultReading);
            defaultBulkEditValues.set(`${id}-meaning`, defaultMeaning);
        }
    }
    async function bulkEditSave() {
        for (const id of getDeckDataGroups().flatMap(g => g.cardIds)) {
            const readingId = `${id}-reading`;
            if (bulkEditIsEdited(readingId)) {
                app.setCustomEntry(deckId, id, bulkEditGetValue(readingId), 'reading');
            }
            const meaningId = `${id}-meaning`;
            if (bulkEditIsEdited(meaningId)) {
                app.setCustomEntry(deckId, id, bulkEditGetValue(meaningId), 'meaning');
            }
        }
        await app.save();
        onBulkEditDone();
        isBulkEdit = false;
        refresh();
    }
    function bulkEditCancel() {
        bulkEditStart();
        onBulkEditDone();
        isBulkEdit = false;
    }
    function bulkEditGetValue(key: string) {
        return bulkEditValues.get(key) ?? "";
    }
    function bulkEditSetValue(key: string, v: string) {
        bulkEditValues.set(key, v);
    }
    function bulkEditIsEdited(key: string) {
        return originalBulkEditValues.get(key) !== bulkEditValues.get(key);
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
        wordlist.resetCustomEntryDict();
        wordlist.registerCustomEntryDict(app.getCustomEntryDict(deckId));
        deckData = app.deckData[deckId]; // refresh
    }
    
    onMount(async () => {
        const tags = app.deckData[deckId]?.tags;
        isZhCantonese = tags?.includes(DECK_TAGS.ZH_YUE);
        const isUseExtraDict = getIsUseExtraDict(tags);
        await wordlist.init(lang, isUseExtraDict);
        wordlist.registerCustomEntryDict(app.getCustomEntryDict(deckId));
        if (standaloneBulkEdit) bulkEditStart();
        isInit = true;
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

{#snippet topSettingsContent()}
    <div class="bulk-edit-buttons-container">
        {#if isBulkEdit}
            <button class="button" onclick={() => bulkEditSave()}>Save Edit</button>
            <button class="button" onclick={() => bulkEditCancel()}>Cancel</button>
        {:else}
            <button class="button" onclick={() => bulkEditStart()}>Start Bulk Edit</button>
            <button class="button" onclick={() => addEmptyCard()}>Add New Empty Card</button>
        {/if}
    </div>
{/snippet}

{#if isEditDeck}
    <TopRevealBar>
        {@render topSettingsContent()}
    </TopRevealBar>
    
    <div style="margin-bottom: 1em;">
        {@render topSettingsContent()}
    </div>
{/if}

<div class="table-container">
    {#if isEditDeck && !isBulkEdit}
        <table class:is-show-id={isShowId}>
            {@render tableHeader([
                {key: 'id', label: 'id'},
                {key: null, label: ''},
                {key: 'word', label: 'word'},
                {key: 'reading', label: 'reading'},
                {key: 'meaning', label: 'meaning'}
            ])}
            {#each getDeckDataGroups() as g}
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
    {:else if isEditDeck && isBulkEdit}
        <table class:is-show-id={isShowId}>
            {@render tableHeader([
                {key: 'id', label: 'id'},
                {key: 'word', label: 'word'},
                {key: 'reading', label: 'reading'},
                {key: 'meaning', label: 'meaning'}
            ])}
            {#each getDeckDataGroups() as g}
                {#if !standaloneBulkEdit}
                    {@render groupHeader(g.label)}
                {/if}
                {#if isAccordionOpen(g.label) || standaloneBulkEdit}
                    <tbody>
                        {#each getSortedCardIds(g.cardIds) as id}
                            <tr class:selected={selections.has(id) && !standaloneBulkEdit}>
                                <td class="id">{id}</td>
                                <td class="word">
                                    {@render editableCell(id, 'word', deckData.deck[id], true, 'width: 3em')}
                                </td>
                                <td class="reading">
                                    <input
                                        type="text"
                                        placeholder={defaultBulkEditValues.get(`${id}-reading`)}
                                        class="bulk-edit-input"
                                        class:edited={bulkEditIsEdited(`${id}-reading`)}
                                        bind:value={
                                            () => bulkEditGetValue(`${id}-reading`),
                                            v => bulkEditSetValue(`${id}-reading`, v)
                                        }
                                        style="width: 5em"
                                    />
                                </td>
                                <td class="meaning">
                                    <textarea
                                        placeholder={defaultBulkEditValues.get(`${id}-meaning`)}
                                        class="bulk-edit-textarea"
                                        class:edited={bulkEditIsEdited(`${id}-meaning`)}
                                        bind:value={
                                            () => bulkEditGetValue(`${id}-meaning`),
                                            v => bulkEditSetValue(`${id}-meaning`, v)
                                        }
                                    ></textarea>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                {/if}
            {/each}
        </table>
        {#if !standaloneBulkEdit}
            <div style="margin-top: 1em;">
                <button class="button" onclick={() => addEmptyCard()}>Add New Empty Card</button>
            </div>
        {/if}
    {:else}
        <table class:is-show-id={isShowId}>
            {@render tableHeader([
                {key: 'id', label: 'id'},
                {key: 'word', label: 'word'},
                {key: 'reading', label: 'reading'},
                {key: 'meaning', label: 'meaning'},
                {key: 'due', label: 'due'}
            ])}
            {#each getDeckDataGroups() as g}
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
    
    textarea {
        max-width: 33vw;
    }
    
    .bulk-edit-buttons-container {
        display: flex;
        gap: 0.5em;
    }
    
    .bulk-edit-input.edited {
        background-color: #EEE8AA;
    }
    
    .bulk-edit-textarea.edited {
        background-color: #EEE8AA;
    }
</style>