<script lang="ts">
    import { base } from '$app/paths';
    import TopBar from "$lib/components/TopBar.svelte";
    import { App } from "$lib/app";
    import { onMount } from "svelte";
    import { DeckInfo } from '$lib/constants';
    
    export let data: {deckId?: string};
    
    let app = new App();
    let isInitialized = false;
    let isTodayDone = false;
    onMount(async () => {
        await app.init();
        app = app;
        isInitialized = true;
        isTodayDone = app.getNextCard(data.deckId ?? '') === undefined;
    })
    
    $: deckInfo = getDeckInfo(data.deckId ?? '');
    
    function getDeckInfo(deckId: string): typeof DeckInfo[number] {
        return DeckInfo.find((s) => s.id === deckId) ?? { id: deckId, title: deckId, subtitle: ''};
    }
</script>

<TopBar title="Overview" backUrl="{base}/"></TopBar>
<div class="container">
    {#if isInitialized}
        <div class="deck-info">
            <span class="deck-card-title">{deckInfo.title}</span>
            <span class="deck-card-subtitle">{deckInfo.subtitle}</span>
        </div>
        <div class="table-container">
            <table class="count-table"><tbody>
                <tr class="row-count-new">
                    <td>New</td>
                    <td class="count">{app.getScheduledNewCardsCount(deckInfo.id)}</td>
                </tr>
                <tr class="row-count-learn-relearn">
                    <td>Learning</td>
                    <td class="count">{app.getLearningRelearningCardsCount(deckInfo.id)}</td>
                </tr>
                <tr class="row-count-previously-studied">
                    <td>Previously Studied</td>
                    <td class="count">{app.getPreviouslyStudiedCardCount(deckInfo.id)}</td>
                </tr>
                <tr class="row-count-review">
                    <td>Review</td>
                    <td class="count">{app.getScheduledReviewCardsCount(deckInfo.id)}</td>
                </tr>
            </tbody></table>
        </div>
    {/if}
</div>
<div class="bottom-bar">
    <a class="button" href="{base}/review?id={deckInfo.id}" class:disabled={isTodayDone}>
        {#if isTodayDone}
            You're done for today
        {:else}
            Study
        {/if}
    </a>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 2em;
        gap: 1em;
        margin-bottom: 2em;
    }
    .deck-info {
        font-size: 1.2em;
        font-weight: bold;
        .deck-card-subtitle {
            font-weight: normal;
            color: #00000080;
        }
    }
    .count-table {
        column-gap: 1em;
        border-spacing: 2em 0;
        .count {
            color: var(--color);
        }
        .row-count-learn-relearn {
            --color: #DB6B6C;
        }
        .row-count-review {
            --color: #419E6F;
        }
        .row-count-new {
            --color: #3E92CC;
        }
        .row-count-previously-studied {
            --color: #DA8C22;
        }
    }
    .bottom-bar {
        position: fixed;
        width: 100vw;
        bottom: 0;
        height: 5em;
        .button {
            height: 3em;
            max-width: 25em;
            margin: auto;
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
        cursor: pointer;
        &:hover {
            opacity: 0.8;
        }
        &.disabled {
            background-color: gray;
            pointer-events: none;
        }
    }
</style>