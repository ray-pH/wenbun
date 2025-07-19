<script lang="ts">
    import { App, WenBunCustomState } from "$lib/app";
    import TopBar from "$lib/components/TopBar.svelte";
    import { onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import * as FSRS from "ts-fsrs"

    export let data: {slug?: string};
    let deckId = data.slug || '';
    
    let app = new App();
    onMount(async () => {
        await app.init();
        // debugRateCard();
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
    $: groups = deckData?.groups ?? {};
    $: groupNames = Object.keys(groups);
    
    let accordionState = new SvelteMap<string, boolean>();
    function toggleAccordion(id: string) {
        accordionState.set(id, !accordionState.get(id));
        accordionState = accordionState;
    }
    function getCardStatusClass(deckId: string, cardId: number): string {
        switch (app.getWenbunCustomState(deckId, cardId) ?? WenBunCustomState.New) {
            case WenBunCustomState.New: return 'card-status-new';
            case WenBunCustomState.Learning: return 'card-status-learning';
            case WenBunCustomState.ReviewYoung: return 'card-status-review-young';
            case WenBunCustomState.ReviewMature: return 'card-status-review-mature';
            case WenBunCustomState.Relearning: return 'card-status-relearning';
            case WenBunCustomState.PreviouslyStudied: return 'card-status-previously-studied';
        }
    }
</script>

<TopBar title="Deck" backUrl="/"></TopBar>
<div class="container">
    <div class="group-container">
        {#each groupNames as groupName}
            <div class="group">
                <button class="group-header" on:click={() => toggleAccordion(groupName)}>
                    <div>
                        {groupName == '__ungrouped__' ? 'Ungrouped' : groupName}
                    </div>
                    <div>
                        {accordionState.get(groupName) ? '-' : '+'}
                    </div>
                </button>
                {#if accordionState.get(groupName)}
                    <div class="group-content">
                        {#each groups[groupName] as id}
                            <div class={`card ${getCardStatusClass(deckId, id)}`}>
                                <div class="card-word">
                                    <span class="word">
                                        {app.getCardWord(deckId, id)}
                                    </span>
                                </div>
                                <div class="card-details">
                                    <div class={`status ${getCardStatusClass(deckId, id)}`}>
                                        {app.getWenbunCustomState(deckId, id) ?? WenBunCustomState.New}
                                    </div>
                                    <div class="due">
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
    }
    .group-container {
        display: flex;
        flex-direction: row;
    }
    .group-content {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 0.5em;
        margin: 0.5em;
    }
    .group {
        width: 34em;
    }
    .group-header {
        all: unset;
        cursor: pointer;
        background-color: #3E92CC;
        padding: 1em;
        color: white;
        border-radius: 0.5em;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .card {
        display: flex;
        flex-direction: column;
        padding: 0.5em;
        background-color: #FFFFFF90;
        width: fit-content;
        border-radius: 0.5rem;
        justify-content: space-between;
        align-items: center;
        min-width: 10em;
        flex-grow: 1;
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
                    background-color: #F9C26A;
                }
                &.card-status-previously-studied {
                    background-color: gray;
                }
            }
        }
    }
    .card-status-new {
        .due {
            color: #00000050;
        }
    }
</style>