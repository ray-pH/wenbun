<script lang="ts">
    import { goto } from '$app/navigation';
    import { base } from '$app/paths';
    import { App, DeckView, DEFAULT_GROUP_CONTENT_COUNT, WenBunCustomState } from "$lib/app";
    import { ChineseCharacterConverter } from '$lib/chinese';
    import TopBar from "$lib/components/TopBar.svelte";
    import { DECK_TAGS } from '$lib/constants';
    import { getDefaultDeckInfo, isBuiltinDeck } from '$lib/util';
    import { onMount } from "svelte";
    import { SvelteMap, SvelteSet } from "svelte/reactivity";
    import * as FSRS from "ts-fsrs"

    export let data: {deckId?: string};
    let deckId = data.deckId || '';
    let isZhTraditional = false;
    let converter: ChineseCharacterConverter;
    let view: DeckView = DeckView.Normal;
    
    let app = new App();
    onMount(async () => {
        await app.init();
        initComponent();
        const changed = await app.initProfile();
        if (changed) initComponent();
        // debugRateCard();
    })
    
    function initComponent() {
        isZhTraditional = app.deckData[deckId]?.tags?.includes(DECK_TAGS.ZH_TRAD);
        converter = new ChineseCharacterConverter('cn', 'tw');
        view = app.getDeckView();
        nameInputStr = app.getDeckInfo(deckId).title;
        app = app;
    }
    
    function debugRateCard() {
        app.getNextCard(deckId);
        app.getNextCard(deckId);
        app.getNextCard(deckId);
        app.getNextCard(deckId);
        app.getNextCard(deckId);
        app.rateCard(deckId, 0, 1);
        app.rateCard(deckId, 1, 2);
        app.rateCard(deckId, 2, 3);
        app.rateCard(deckId, 3, 3);
        app.rateCard(deckId, 3, 3);
        app.rateCard(deckId, 3, 3);
        app.rateCard(deckId, 4, 4);
        app.rateCard(deckId, 4, 4, app.getCard(deckId, 4)!.due);
    }
    
    $: deckData = app.deckData[deckId];
    $: deckInfo = app.getDeckInfo(data.deckId ?? '');
    $: groups = deckData?.groups ?? [];
    
    let accordionState = new SvelteMap<string, boolean>();
    function toggleAccordion(id: string) {
        accordionState.set(id, !accordionState.get(id));
        accordionState = accordionState;
    }
    function getCardStatusClass(deckId: string, cardId: number, app: App): string {
        switch (app.getWenbunCustomState(deckId, cardId) ?? WenBunCustomState.New) {
            case WenBunCustomState.New: return 'card-status-new';
            case WenBunCustomState.WarmUp: return 'card-status-new';
            case WenBunCustomState.Learning: return 'card-status-learning';
            case WenBunCustomState.ReviewYoung: return 'card-status-review-young';
            case WenBunCustomState.ReviewMature: return 'card-status-review-mature';
            case WenBunCustomState.Relearning: return 'card-status-relearning';
            case WenBunCustomState.PreviouslyStudied: return 'card-status-previously-studied';
            case WenBunCustomState.Ignored: return 'card-status-ignored';
        }
    }
    
    function getCardWord(deckId: string, cardId: number): string {
        const word = app.getCardWord(deckId, cardId);
        return isZhTraditional ? converter.convert(word) : word;
    }
    
    let groupContentCount = DEFAULT_GROUP_CONTENT_COUNT;
    async function splitIntoGroupsOf() {
        const groupCount = Math.ceil(deckData.deck.length / groupContentCount);
        const confirm = window.confirm(`Split the deck into ${groupCount} groups?`);
        if (confirm) {
            app.splitDeckIntoGroupOfN(deckId, groupContentCount);
            await app.save();
            app = app;
        }
    }
    
    async function deleteDeck() {
        const confirmed1 = window.confirm("Are you sure you want to delete this deck?");
        if (!confirmed1) return;
        const confirmed2 = window.confirm("Are you really sure you want to delete this deck? All data will be lost.");
        if (!confirmed2) return;
        app.deleteDeck(deckId, confirmed1 && confirmed2);
        await app.save();
        goto(`${base}/`);
    }
    
    let isSelecting = false;
    let selections: SvelteSet<number> = new SvelteSet();
    $: isSelectionContainPreviouslyStudied = Array.from(selections).some(id => app.getWenbunCustomState(deckId, id) == WenBunCustomState.PreviouslyStudied);
    $: isSelectionContainIgnored = Array.from(selections).some(id => app.getWenbunCustomState(deckId, id) == WenBunCustomState.Ignored);
    function startSelectMode(cardId?: number, e?: MouseEvent) {
        e?.stopPropagation();
        isSelecting = true;
        selections.clear();
        if (cardId != undefined) selections.add(cardId);
        selections = selections;
    }
    function stopSelectMode() {
        isSelecting = false;
        selections.clear();
        selections = selections;
    }
    function isSelected(cardId: number, selections: SvelteSet<number>): boolean {
        return selections.has(cardId);
    }
    function toggleSelect(cardId: number) {
        if (!isSelecting) {
            startSelectMode(cardId);
            return;
        }
        
        if (selections.has(cardId)) {
            selections.delete(cardId);
        } else {
            selections.add(cardId);
        }
        selections = selections;
    }
    function selectAllInGroup(groupLabel: string) {
        const group = deckData.groups.find(g => g.label == groupLabel);
        if (group == undefined) return;
        selections.clear();
        for (const id of group.cardIds) {
            selections.add(id);
        }
        selections = selections;
    }
    async function addPreviouslyStudiedMark() {
        selections.forEach((id) => { app.addPreviouslyStudiedMark(deckId, id); });
        await app.save();
        app = app;
    }
    async function removePreviouslyStudiedMark() {
        selections.forEach((id) => { app.removePreviouslyStudiedMark(deckId, id); });
        await app.save();
        app = app;
    }
    async function addIgnoredMark() {
        selections.forEach((id) => { app.addIgnoredMark(deckId, id); });
        await app.save();
        app = app;
    }
    async function removeIgnoredMark() {
        selections.forEach((id) => { app.removeIgnoredMark(deckId, id); });
        await app.save();
        app = app;
    }
    
    function statusToLabel(status: WenBunCustomState): string {
        if (status === WenBunCustomState.WarmUp) return WenBunCustomState.New;
        return status;
    }
    
    function changeView(view: DeckView) {
        app.setDeckView(view);
    }
    
    function startExtraStudy() {
        if (!isSelecting || selections.size === 0) return;
        app.extraStudyHandler.startExtraStudy(deckId, Array.from(selections));
    }
    
    $: isNameEditable = !isBuiltinDeck(deckId);
    let isEditingName = false;
    let nameInputStr = '';
    let inputEl: HTMLInputElement | null = null;
    $: if (isEditingName && inputEl) {
        inputEl.focus();
    }
    async function renameDeck() {
        if (nameInputStr.trim() === '') {
            window.alert('Deck name cannot be empty.');
            return;
        }
        app.renameDeck(deckId, nameInputStr);
        await app.save();
        isEditingName = false;
        app = app;
    }
    function cancelRename(): any {
        isEditingName = false;
        nameInputStr = app.getDeckInfo(deckId).title;
    }
    
    async function moveCardsIntoGroup() {
        const grouplabel = window.prompt('Enter target group name: *(new group will be created if name does not exists)');
        if (!grouplabel) return;
        app.moveCardsIntoGroup(deckId, Array.from(selections), grouplabel);
        await app.save();
        selections.clear();
        app = app;
    }
</script>

<TopBar title="Deck"></TopBar>
<div class="container">
    <div class="top-container">
        <div class="deck-name-container">
            {#if isEditingName}
                <form onsubmit={(e) => {e.preventDefault(); renameDeck()}}>
                    <input class="name-input" type="text" bind:value={nameInputStr} bind:this={inputEl}>
                    <button class="button-name-edit"
                        type="submit"
                        aria-label="Save deck name"
                    >
                        <i class="fa-solid fa-square-check"></i>
                    </button>
                    <button class="button-name-edit"
                        onclick={() => cancelRename()}
                        aria-label="Cancel"
                    >
                        <i class="fa-solid fa-square-xmark"></i>
                    </button>
                </form>
            {:else}
                <div class="deck-info">
                    <span class="deck-card-title">{deckInfo.title}</span>
                    <span class="deck-card-subtitle">{deckInfo.subtitle}</span>
                    <div class="loading">
                    </div>
                </div>
                {#if isNameEditable}
                    <button class="button-name-edit" 
                        onclick={() => isEditingName = true}
                        aria-label="Edit deck name"
                    >
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                {/if}
            {/if}
        </div>
        <div class="top-control-container">
            <div>
                <label style="display: flex; gap: 0.5em; align-items: center; justify-content: space-between;">
                    View:
                    <select bind:value={view} onchange={() => changeView(view)} style="flex-grow: 1;">
                        <option value={DeckView.Normal}>Normal</option>
                        <option value={DeckView.Small}>Small</option>
                    </select>
                </label>
            </div>
            <div style="display: flex; gap: 0.5em; align-items: center;">
                <button class="button" onclick={() => splitIntoGroupsOf()}>Split into groups of</button>
                <input class="input" type="number" bind:value={groupContentCount} min="1" max="100">
            </div>
            <button class="button delete-button" onclick={() => deleteDeck()}>
                <i class="fa-solid fa-trash"></i>
                Delete this Deck
            </button>
        </div>
    </div>
    <div class="group-container">
        {#each groups as group}
            <div class="group">
                <button class="group-header" onclick={() => toggleAccordion(group.label)}>
                    <div>
                        {group.label == '__ungrouped__' ? 'Ungrouped' : group.label}
                    </div>
                    <div>
                        {#if accordionState.get(group.label)}
                            <i class="fa-solid fa-chevron-down"></i>
                        {:else}
                            <i class="fa-solid fa-chevron-right"></i>
                        {/if}
                    </div>
                </button>
                {#if accordionState.get(group.label)}
                    {#if isSelecting}
                        <div style="display: flex; flex-direction: row; justify-content: space-between; width: 100%; gap: 0.5em;">
                            <div class="group-buttons-container" style="align-items: flex-start;">
                                <button class="button" onclick={() => stopSelectMode()}>
                                    <i class="fa-solid fa-xmark"></i>cancel selection
                                </button>
                                <button class="button" onclick={() => selectAllInGroup(group.label)}>
                                    <i class="fa-solid fa-check-double"></i>select all in this group
                                </button>
                            </div>
                            <div class="group-buttons-container" style="align-items: flex-end;">
                                <button class="button" disabled={selections.size == 0} onclick={() => startExtraStudy()}>
                                    <i class="fa-solid fa-chalkboard-user"></i><span>start <b>extra study</b> from selection</span></button>
                                <button class="button" disabled={selections.size == 0} onclick={() => moveCardsIntoGroup()}>
                                    <i class="fa-solid fa-right-left"></i><span>move to another group</span></button>
                                <button class="button" disabled={selections.size == 0} onclick={() => addPreviouslyStudiedMark()}>
                                    <i class="fa-solid fa-book-open"></i><span>mark as <b>previously studied</b></span></button>
                                <button class="button" disabled={selections.size == 0 || !isSelectionContainPreviouslyStudied} 
                                    onclick={() => removePreviouslyStudiedMark()}>
                                    <i class="fa-solid fa-book-open"></i><span>remove <b>previously studied</b> mark</span></button>
                                <button class="button" disabled={selections.size == 0} onclick={() => addIgnoredMark()}>
                                    <i class="fa-solid fa-square-xmark"></i><span>mark as <b>ignored</b></span></button>
                                <button class="button" disabled={selections.size == 0 || !isSelectionContainIgnored} 
                                    onclick={() => removeIgnoredMark()}>
                                    <i class="fa-solid fa-square-xmark"></i><span>remove <b>ignored</b> mark</span></button>
                            </div>
                        </div>
                    {/if}
                    <div class="group-content">
                        {#each group.cardIds as id}
                            {#if view == DeckView.Normal}
                                {@render NormalCard(id, group)}
                            {:else if view == DeckView.Small}
                                {@render SmallCard(id, group)}
                            {:else}
                                {@render NormalCard(id, group)}
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

{#snippet NormalCard(id: number, group: typeof groups[number])}
    <div 
        class={`card ${getCardStatusClass(deckId, id, app)}`} 
        class:selectable={isSelecting}
        class:selected={isSelected(id, selections)}
        onclick={() => toggleSelect(id)}
        onkeydown={(e) => {
            if (e.key == 'Enter') toggleSelect(id);
        }}
        role="button"
        tabindex="0"
    >
        {#if !isSelecting}
            <button class="button select-button" onclick={(e) => startSelectMode(id, e)}>
                select
            </button>
        {/if}
        <div class="card-word">
            <span class="word chinese-font">
                {getCardWord(deckId, id)}
            </span>
        </div>
        <div class="card-details">
            <div class={`status ${getCardStatusClass(deckId, id, app)}`}>
                {statusToLabel(app.getWenbunCustomState(deckId, id) ?? WenBunCustomState.New)}
            </div>
            <div class={`due ${getCardStatusClass(deckId, id, app)}`}>
                {app.getCardDueFormatted(deckId, id)}
            </div>
        </div>
    </div>
{/snippet}

{#snippet SmallCard(id: number, group: typeof groups[number])}
    <div 
        class={`card-small ${getCardStatusClass(deckId, id, app)}`} 
        class:selected={isSelected(id, selections)}
        onclick={() => toggleSelect(id)}
        onkeydown={(e) => {
            if (e.key == 'Enter') toggleSelect(id);
        }}
        role="button"
        tabindex="0"
    >
        <div class="card-word">
            <span class="word chinese-font">
                {getCardWord(deckId, id)}
            </span>
        </div>
        <div class="card-details">
            <div class={`due ${getCardStatusClass(deckId, id, app)}`}>
                {app.getShortCardDueFormatted(deckId, id)}
            </div>
        </div>
    </div>
{/snippet}

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 1em;
        padding-top: 1em;
    }
    .top-container {
         display: flex;
         gap: 2em; 
         margin-bottom: 2em; 
         flex-direction: column;
         align-items: center;
    }
    .top-control-container {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }
    .deck-info {
        position: relative;
        font-size: 1.2em;
        font-weight: bold;
        .deck-card-subtitle {
            font-weight: normal;
            color: #00000080;
        }
    }
    .deck-name-container {
        display: flex;
        align-items: center;
        gap: 0.5em;
    }
    .button-name-edit {
        all: unset;
        color: gray;
        cursor: pointer;
        &:hover {
            color: unset;
        }
    }
    .group-container {
        display: flex;
        flex-direction: column;
        gap: 2em;
    }
    .group-content {
        width: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 0.5em;
        margin-top: 0.5em;
    }
    .group {
        width: 100vw;
        padding: 0 1em;
        box-sizing: border-box;
        max-width: 38em;
    }
    .group-header {
        all: unset;
        cursor: pointer;
        background-color: var(--wenbun-blue);
        padding: 1em;
        color: white;
        border-radius: 0.5em;
        width: 100%;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .card {
        display: flex;
        position: relative;
        flex-direction: column;
        padding: 0.5em;
        background-color: #FFFFFF90;
        width: fit-content;
        border-radius: 0.5rem;
        justify-content: space-between;
        align-items: center;
        min-width: 10em;
        flex-grow: 1;
        &.selectable {
            cursor: pointer;
        }
        &.selected {
            outline: 5px solid var(--wenbun-blue);
            outline-offset: -3px;
        }
        .card-word {
            font-size: 4em;
            padding: 0em 0.2em;
            margin-bottom: 0.1em;
        }
        .card-details {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 0.5em;
            width: 100%;
            .due.card-status-ignored {
                display: none;
            }
            .status{
                background-color: white;
                padding: 0.2em 0.6em;
                border-radius: 0.3rem;
                flex-grow: 1;
                color: white;
                &.card-status-new {
                    background-color: gray;
                }
                &.card-status-learning {
                    background-color: var(--wenbun-red);
                }
                &.card-status-review-young {
                    background-color: var(--wenbun-green);
                }
                &.card-status-review-mature {
                    background-color: var(--wenbun-blue);
                }
                &.card-status-relearning {
                    background-color: var(--wenbun-red);
                }
                &.card-status-previously-studied {
                    background-color: var(--wenbun-orange);
                }
                &.card-status-ignored {
                    color: black;
                    background-color: #FFFFFF;
                }
            }
        }
    }
    .card.card-status-ignored {
        opacity: 0.5;
    }
    .card-status-new {
        .due {
            color: #00000050;
        }
    }
    .card.card-status-previously-studied {
        .due {
            display: none;
        }
    }
    .button {
        gap: 0.5em;
    }
    .delete-button {
        background-color: #B75657;
    }
    .select-button {
        position: absolute;
        left: 0.5em;
        visibility: hidden;
    }
    .card:hover .select-button {
        visibility: visible;
    }
    .group-buttons-container {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
        margin: 0.5em 0;
    }
    .card-small {
        display: flex;
        flex-grow: 1;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 0.5em;
        padding: 0.5em;
        background-color: #FFFFFF90;
        width: fit-content;
        border-radius: 0.5rem;
        cursor: pointer;
        &.card-status-ignored {
            opacity: 0.5;
        }
        &.selected {
            outline: 5px solid var(--wenbun-blue);
            outline-offset: -3px;
        }
        .card-word {
            font-size: 1.5em;
        }
        .card-details {
            color: white;
            .due {
                padding: 0.2em 0.2em;
                min-width: 0.05em;
                min-height: 0.5em;
                border-radius: 0.5rem;
                &.card-status-new {
                    padding: 0;
                    min-width: 0;
                    min-height: 0;
                    border-radius: 0;
                    display: none;
                }
                &.card-status-learning {
                    background-color: var(--wenbun-red);
                }
                &.card-status-review-young {
                    background-color: var(--wenbun-green);
                }
                &.card-status-review-mature {
                    background-color: var(--wenbun-blue);
                }
                &.card-status-relearning {
                    background-color: var(--wenbun-red);
                }
                &.card-status-previously-studied {
                    background-color: var(--wenbun-orange);
                }
                &.card-status-ignored {
                    padding: 0;
                    min-width: 0;
                    min-height: 0;
                    border-radius: 0;
                    display: none;
                }
            }
        }
    }
</style>