<script lang="ts">
    import { base } from '$app/paths';
    import { onMount } from "svelte";
    import { App } from "$lib/app";
    import TopBar from "$lib/components/TopBar.svelte";
    import { DeckInfo } from "$lib/constants";
    
    let app = new App();
    let isAutomaticallyLoggedOut = false;
    $: activeDeckIds = Object.keys(app.deckData);
    $: locked = isAutomaticallyLoggedOut;
    onMount(async () => {
        await app.init();
        app = app;
        registerSW();
        
        const changed = await app.initProfile();
        isAutomaticallyLoggedOut = app.profile.isAutomaticallyLoggedOut();
        if (changed) app = app;
    })
    
    function registerSW() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register(`${base}/service-worker.js`)
                .then(reg => {
                    // console.log('SW registered:', reg)
                })
                .catch(err => console.error('SW registration failed:', err));
        }
    }
    
    function getDeckInfo(deckId: string): typeof DeckInfo[number] {
        return DeckInfo.find((s) => s.id === deckId) ?? { id: deckId, title: deckId, subtitle: ''};
    }
    function loginGoogle() {
        app.profile.loginGoogle(app);
    }
    function stayLoggedOut() {
        const confirm = window.confirm('Are you sure you want to stay logged out? You might need to sync manually later');
        if (!confirm) return;
        app.profile.updateLoginStatus(undefined);
        isAutomaticallyLoggedOut = app.profile.isAutomaticallyLoggedOut();
    }
</script>

<TopBar title="WenBun (beta)"></TopBar>
<div class="main-container">
    <div class="top-container">
        <a class="a-button" style="background-color: #A0D0F0;" href="{base}/about/">Changelog</a>
        {#if !locked}
            <a class="a-button" href="{base}/deck-browser/">Add New Deck</a>
        {/if}
    </div>
    <div class="hr"></div>
    {#if !locked}
        <div class="deck-list-container">
            {#each activeDeckIds as deckId}
                <div class="deck-card-container">
                    {@render deckCard(getDeckInfo(deckId))}
                    <a class="deck-card-button" href="{base}/deck?id={deckId}" title="Deck Info" aria-label="Deck Info">
                        <i class="fa-solid fa-list"></i>
                    </a>
                </div>
            {/each} 
        </div> 
    {:else}
        <div class="auto-logout-info-container">
            <div>
                <i class="fa-solid fa-circle-info" style="color: #3E92CC;"></i>
                <p>
                    You are <b>unexpectedly logged out</b> due to session expiration or server issue.
                    Try logging in again.
                </p>
                <p class="note">(*Please report to the developer if this happens frequently.)</p>
                <div>
                    <button class="button" onclick={loginGoogle}>
                        <i class="fa-brands fa-google"></i>&nbsp;
                        Log in with Google
                    </button>
                    <button class="button invert" onclick={stayLoggedOut}>
                        <i class="fa-solid fa-ban"></i>&nbsp;
                        Stay Logged Out
                    </button>
                </div>
            </div>
        </div> 
    {/if}
</div>

{#snippet deckCard(info: typeof DeckInfo[number])}
    <a class="deck-card" href="{base}/overview?id={info.id}">
        <div class="left">
            <span class="deck-card-title">{info.title}</span>
            <span class="deck-card-subtitle">{info.subtitle}</span>
        </div>
        <div class="right">
            <span class="deck-count-learn-relearn" title="learning">
                {app.getLearningRelearningCardsCount(info.id) || ''}
            </span>
            <span class="deck-count-review" title="review">
                {app.getScheduledReviewCardsCount(info.id) || ''}
            </span>
            <span class="deck-count-new" title="new">
                {app.getScheduledNewOrWarmUpCardsCount(info.id) || ''}
            </span>
            <span class="deck-count-previously-studied" title="previously studied">
                {app.getScheduledPreviouslyStudiedCardsCount(info.id) || ''}
            </span>
        </div>
    </a>
{/snippet}

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        margin: 1em 0;
    }
    .hr {
        width: calc(100vw - 2em);
        max-width: 20em;
        height: 1px;
        background-color: #00000090;
    }
    .deck-list-container {
        display: flex;
        flex-direction: column;
        gap: 1em;
        margin-top: 2em;
    }
    .deck-card-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5em;
        width: calc(100vw - 2em);
        max-width: 30em;
    }
    .deck-card {
        all: unset;
        background-color: #FFFFFF90;
        border-radius: 0.5em;
        padding: 1em;
        flex-grow: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        
        .deck-card-title {
            font-weight: bold;
        }
        .deck-card-subtitle {
            color: #00000080;
            font-size: 0.9em;
        }
        .right {
            color: #3E92CC;
        }
    }
    .deck-card {
        .right {
            display: grid;
            gap: 0.5em;
            grid-template-columns: 1.5em 1.5em 1.5em 1.5em;
            .deck-count-learn-relearn {
                place-self: center;
                color: #DB6B6C
            }
            .deck-count-review {
                place-self: center;
                color: #419E6F
            }
            .deck-count-new {
                place-self: center;
                color: #3E92CC;
            }
            .deck-count-previously-studied {
                place-self: center;
                color: #DA8C22;
            }
        }
    }
    .deck-card-button {
        all: unset;
        color: white;
        background-color: #3E92CC;
        cursor: pointer;
        border-radius: 0.5em;
        width: 2.5em;
        height: 2.5em;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .top-container {
        margin: 2em;
        display: flex;
        flex-direction: column;
        gap: 1em;
    }
    .a-button {
        all: unset;
        display: block;
        background-color: #FFFFFF90;
        width: calc(100vw - 4em);
        max-width: 20em;
        border-radius: 0.5em;
        padding: 1em;
        cursor: pointer;
    }
    .auto-logout-info-container {
        background-color: #FFFFFF90;
        border-radius: 0.5em;
        width: calc(100vw - 4em);
        max-width: 30em;
        margin-top: 1em;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2em;
        .note {
            font-size: 0.9em;
            color: #00000090;
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
        margin-top: 0.5em;
        &.invert {
            border: #3E92CC solid 1px;
            background-color: #FFFFFF90;
            color: #3E92CC;
            &:hover {
                background-color: lightgray;
            }
        }
        &:hover {
            opacity: 0.8;
        }
        &:disabled {
            background-color: gray;
            pointer-events: none;
        }
    }
</style>
