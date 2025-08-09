<script lang="ts">
    import { base } from '$app/paths';
    import { App, DEFAULT_GROUP_CONTENT_COUNT, WenBunCustomState } from "$lib/app";
    import { ChineseCharacterConverter } from '$lib/chinese';
    import TopBar from "$lib/components/TopBar.svelte";
    import { DECK_TAGS } from '$lib/constants';
    import { onMount } from "svelte";
    import { SvelteMap, SvelteSet } from "svelte/reactivity";
    import * as FSRS from "ts-fsrs"

    export let data: {deckId?: string};
    let deckId = data.deckId || '';
    let isZhTraditional = false;
    let converter: ChineseCharacterConverter;
    
    let app = new App();
    onMount(async () => {
        await app.init();
        // debugRateCard();
        isZhTraditional = app.deckData[deckId]?.tags?.includes(DECK_TAGS.ZH_TRAD);
        converter = new ChineseCharacterConverter('cn', 'tw');
        app = app;
    })
    
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
    $: groups = deckData?.groups ?? [];
    
    let accordionState = new SvelteMap<string, boolean>();
    function toggleAccordion(id: string) {
        accordionState.set(id, !accordionState.get(id));
        accordionState = accordionState;
    }
    function getCardStatusClass(deckId: string, cardId: number, app: App): string {
        switch (app.getWenbunCustomState(deckId, cardId) ?? WenBunCustomState.New) {
            case WenBunCustomState.New: return 'card-status-new';
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
    
    let selectModeGroup: string | null = null;
    let selections: SvelteSet<number> = new SvelteSet();
    function startSelectMode(group: string, cardId?: number, e?: MouseEvent) {
        e?.stopPropagation();
        selectModeGroup = group;
        selections.clear();
        if (cardId != undefined) selections.add(cardId);
        selections = selections;
    }
    function stopSelectMode() {
        selectModeGroup = null;
        selections.clear();
        selections = selections;
    }
    function isSelected(groupLabel: string, cardId: number, selections: SvelteSet<number>): boolean {
        return selectModeGroup == groupLabel && selections.has(cardId);
    }
    function toggleSelect(groupLabel: string, cardId: number) {
        if (selectModeGroup != groupLabel) return;
        if (selections.has(cardId)) {
            selections.delete(cardId);
        } else {
            selections.add(cardId);
        }
        selections = selections;
    }
    function selectAll() {
        if (selectModeGroup == null) return;
        const group = deckData.groups.find(g => g.label == selectModeGroup);
        if (group == undefined) return;
        selections.clear();
        for (const id of group.cardIds) {
            selections.add(id);
        }
        selections = selections;
    }
    async function addPreviouslyStudiedMark() {
        if (selectModeGroup == null) return;
        selections.forEach((id) => { app.addPreviouslyStudiedMark(deckId, id); });
        await app.save();
        app = app;
    }
    async function removePreviouslyStudiedMark() {
        if (selectModeGroup == null) return;
        selections.forEach((id) => { app.removePreviouslyStudiedMark(deckId, id); });
        await app.save();
        app = app;
    }
    async function addIgnoredMark() {
        if (selectModeGroup == null) return;
        selections.forEach((id) => { app.addIgnoredMark(deckId, id); });
        await app.save();
        app = app;
    }
    async function removeIgnoredMark() {
        if (selectModeGroup == null) return;
        selections.forEach((id) => { app.removeIgnoredMark(deckId, id); });
        await app.save();
        app = app;
    }
    
</script>

<TopBar title="Deck" backUrl="{base}/"></TopBar>
<div class="container">
    <div class="top-container" style="display: flex; gap: 0.5em; margin-bottom: 2em">
        <button class="button" onclick={() => splitIntoGroupsOf()}>Split into groups of</button>
        <input class="input" type="number" bind:value={groupContentCount} min="1" max="100">
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
                    {#if selectModeGroup == group.label}
                        <div style="display: flex; flex-direction: row; justify-content: space-between; width: 100%; gap: 0.5em;">
                            <div class="group-buttons-container" style="align-items: flex-start;">
                                <button class="button" onclick={() => stopSelectMode()}>
                                    <i class="fa-solid fa-xmark"></i>cancel selection
                                </button>
                                <button class="button" onclick={() => selectAll()}>
                                    <i class="fa-solid fa-check-double"></i>select all
                                </button>
                            </div>
                            <div class="group-buttons-container" style="align-items: flex-end;">
                                <button class="button" disabled={selections.size == 0} onclick={() => addPreviouslyStudiedMark()}>
                                    <i class="fa-solid fa-book-open"></i><span>mark as <b>previously studied</b></span></button>
                                <button class="button" disabled={selections.size == 0} onclick={() => removePreviouslyStudiedMark()}>
                                    <i class="fa-solid fa-book-open"></i><span>remove <b>previously studied</b> mark</span></button>
                                <button class="button" disabled={selections.size == 0} onclick={() => addIgnoredMark()}>
                                    <i class="fa-solid fa-square-xmark"></i><span>mark as <b>ignored</b></span></button>
                                <button class="button" disabled={selections.size == 0} onclick={() => removeIgnoredMark()}>
                                    <i class="fa-solid fa-square-xmark"></i><span>remove <b>ignored</b> mark</span></button>
                            </div>
                        </div>
                    {/if}
                    <div class="group-content">
                        {#each group.cardIds as id}
                            <div 
                                class={`card ${getCardStatusClass(deckId, id, app)}`} 
                                class:selectable={selectModeGroup == group.label}
                                class:selected={isSelected(group.label, id, selections)}
                                onclick={() => toggleSelect(group.label, id)}
                                onkeydown={(e) => {
                                    if (e.key == 'Enter') toggleSelect(group.label, id);
                                }}
                                role="button"
                                tabindex="0"
                            >
                                {#if selectModeGroup != group.label}
                                    <button class="button select-button" onclick={(e) => startSelectMode(group.label, id, e)}>
                                        select
                                    </button>
                                {/if}
                                <div class="card-word">
                                    <span class="word">
                                        {getCardWord(deckId, id)}
                                    </span>
                                </div>
                                <div class="card-details">
                                    <div class={`status ${getCardStatusClass(deckId, id, app)}`}>
                                        {app.getWenbunCustomState(deckId, id) ?? WenBunCustomState.New}
                                    </div>
                                    <div class={`due ${getCardStatusClass(deckId, id, app)}`}>
                                        {app.getCardDueFormatted(deckId, id)}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 1em;
        padding-top: 1em;
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
        background-color: #3E92CC;
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
            outline: 5px solid #3E92CC;
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
                    background-color: #DB6B6C;
                }
                &.card-status-review-young {
                    background-color: #419E6F;
                }
                &.card-status-review-mature {
                    background-color: #3E92CC;
                }
                &.card-status-relearning {
                    background-color: #DB6B6C;
                }
                &.card-status-previously-studied {
                    background-color: #DA8C22;
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
    .card-status-previously-studied {
        .due {
            display: none;
        }
    }
    .button {
        all: unset;
        color: white;
        background-color: #3E92CC;
        border-radius: 0.5em;
        font-size: 0.9em;
        padding: 0.5em 1em;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5em;
        cursor: pointer;
        &:hover {
            opacity: 0.8;
        }
        &:disabled {
            background-color: gray;
            pointer-events: none;
        }
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
</style>