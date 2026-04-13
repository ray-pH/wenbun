<script lang="ts">
    import { base } from '$app/paths';
    import { onMount } from "svelte";
    import { App } from "$lib/app";
    import TopBar from "$lib/components/TopBar.svelte";
    import { DeckInfo } from "$lib/constants";
    import { DragDropManager, performArrayReorder } from "$lib/dragAndDrop";
    import ButtonPopoverMenu from '$lib/components/ButtonPopoverMenu.svelte';
    import { LoginStatus, ManualSyncStatus, SyncMode } from '$lib/profile';
    import Loading from '$lib/components/Loading.svelte';
    import { registerSW } from 'virtual:pwa-register';
    import { isTauri } from '@tauri-apps/api/core';
    
    registerSW({
        immediate: true,
        onRegisteredSW(swUrl, reg) {
            console.log("SW registered:", swUrl, reg);
        },
        onRegisterError(err) {
            console.error("SW registration failed:", err);
        },
    });
    
    let syncStatus: ManualSyncStatus | undefined = undefined;
    let app = new App();
    let isAutomaticallyLoggedOut = false;
    let isNewUpdateExist = false;
    let isShowLastStudied = false;
    let deckOrder: string[] = [];
    let isShowDataExportReminder = false;
    let isBackupReminderExpanded = false;
    
    $: {
        // Update deckOrder when app.decks changes
        if (!arraysEqual(deckOrder, app.decks)) {
            deckOrder = [...app.decks];
        }
    }
    $: activeDeckIds = deckOrder.length > 0 ? deckOrder : Object.keys(app.deckData);
    $: locked = isAutomaticallyLoggedOut;
    $: isSeparateLearnAndReview = app.getConfig().isSeparateLearnAndReview;
    $: isShowDataExportReminder = !locked && !isTauri() && !app.profile.isLoggedIn && app.isDataExportReminderDue;
    $: lastExportedAtString = (() => {
        const lastExportedAt = app.getDataExportReminderMeta().lastExportedAt;
        if (!lastExportedAt) return '';
        const date = new Date(lastExportedAt);
        return isNaN(date.getTime()) ? '' : date.toLocaleString();
    })();

    function arraysEqual(a: string[], b: string[]) {
        return a.length === b.length && a.every((val, index) => val === b[index]);
    }

    let isAppInitialized = false;
    onMount(async () => {
        await app.init();
        // Initialize deckOrder after app init
        deckOrder = [...app.decks];
        app = app;
        isShowLastStudied = app.getConfig().showDeckLastStudyTime;
        isAppInitialized = true;
        isNewUpdateExist = app.isNewUpdateExist();
        const changed = await app.initProfile();
        isAutomaticallyLoggedOut = app.profile.isAutomaticallyLoggedOut();
        if (changed) {
            app = app;
            deckOrder = [...app.decks];
            isShowLastStudied = app.getConfig().showDeckLastStudyTime;
        }
        isNewUpdateExist = app.isNewUpdateExist();
        
        const isManualSync = (await app.profile.getSyncMode()) === SyncMode.manual;
        if (isManualSync) syncStatus = await app.profile.getManualSyncStatus(app);
    });
    
    function loginGoogle() {
        app.profile.loginGoogle(app);
    }
    
    function stayLoggedOut() {
        const confirm = window.confirm('Are you sure you want to stay logged out? You might need to sync manually later');
        if (!confirm) return;
        app.profile.updateLoginStatus(LoginStatus.loggedOut);
        isAutomaticallyLoggedOut = app.profile.isAutomaticallyLoggedOut();
    }

    async function exportProfileData() {
        await app.downloadProfile();
        app = app;
    }
    
   	let dragDropManager: DragDropManager;
    let isReordering = false;
    function startReordering() {
        isReordering = true;
    }
    async function stopReordering() {
        isReordering = false;
  		try {
 			await app.save();
  		} catch (error) {
 			console.error('Failed to save reorder:', error);
  		}
    }
    const actions = [
        { icon: 'fa fa-solid fa-sort', label: 'Reorder Deck', onclick: () => startReordering() },
    ];
    
   	async function handleReorder(fromIndex: number, toIndex: number) {
  		const newOrder = performArrayReorder(activeDeckIds, fromIndex, toIndex);
  		// Update the order
  		deckOrder = newOrder;
  		app.decks = newOrder;
   	}
    
    let isSyncing = false;
    async function trySync() {
        isSyncing = true;
        if (syncStatus === ManualSyncStatus.canPull || syncStatus === ManualSyncStatus.canPush) {
            await app.profile.trySyncProfile(app);
            syncStatus = await app.profile.getManualSyncStatus(app);
        } else if (syncStatus === ManualSyncStatus.conflict) {
            await app.profile.trySyncProfile(app);
        } else if (syncStatus === ManualSyncStatus.noSync) {
            window.alert("Data is already up-to-date");
        }
        isSyncing = false;
    }
    
    function getDeckLastStudiedString(deckId: string): string {
        const date = new Date(app.getDeckLastStudied(deckId));
        if (date.getTime() === 0) return '-';
        else return date.toLocaleString();
    }
   	
   	// Initialize drag drop manager when component mounts
   	onMount(() => {
  		dragDropManager = new DragDropManager({
 			onReorder: handleReorder
  		});
        
  		return () => {
 			// Cleanup on component destroy
 			if (dragDropManager) {
				dragDropManager.cleanup();
 			}
  		};
   	});
</script>

<TopBar 
    title="WenBun (beta)" noBack={true}
    syncStatus={syncStatus}
    syncButtonCallback={() => trySync()}
    isSyncing={isSyncing}
></TopBar>
<div class="main-container">
    <div class="top-container">
        <a class="a-button" style="background-color: #A0D0F0;" href="{base}/about/">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>Changelog</span>
                <span style="opacity: 0.4; font-weight: bold;">v{app.getCurrentAppVersion()}</span>
            </div>
            {#if isNewUpdateExist}
                <span class="update-circle"></span>
            {/if}
        </a>
        {#if !locked}
            <a class="a-button" href="{base}/deck-browser/">Add New Deck</a>
        {/if}
    </div>
    {#if isShowDataExportReminder}
        <div class="data-export-reminder" class:is-expanded={isBackupReminderExpanded}>
            <div class="reminder-header">
                <button
                    class="reminder-toggle"
                    onclick={() => isBackupReminderExpanded = !isBackupReminderExpanded}
                    aria-expanded={isBackupReminderExpanded}
                    aria-label="Toggle backup reminder details"
                >
                    <span class="title">
                        <i class="fa-solid fa-circle-info"></i>
                        Backup reminder
                    </span>
                    <i class="fa-solid fa-chevron-{isBackupReminderExpanded ? 'up' : 'down'}"></i>
                </button>
                <button class="button export-now-button" onclick={() => exportProfileData()}>
                    <i class="fa-solid fa-download"></i>&nbsp;
                    Export
                </button>
            </div>

            {#if isBackupReminderExpanded}
                <div class="details">
                    You are currently using WenBun in a browser without login. Browser/site data can be cleared unexpectedly, which may erase your progress.
                    Please export your profile data regularly and keep backups in a safe place.
                </div>
                {#if lastExportedAtString}
                    <div class="last-exported">Last export: {lastExportedAtString}</div>
                {/if}
                <div class="actions">
                    <a href="{base}/settings/#data-export-reminder">Disable or change reminder period in settings</a>
                </div>
            {/if}
        </div>
    {/if}
    <div class="hr"></div>
    {#if !locked}
        <div class="top-button-container">
            <div class="left">
                {#if isReordering}
                    <button onclick={() => stopReordering()} class="button">
                        save
                    </button>
                {/if}
            </div>
            <ButtonPopoverMenu items={actions} align="end" />
        </div>
        <div class="deck-list-container">
            {#if !isAppInitialized}
                <Loading></Loading>
            {/if}
            {#each activeDeckIds as deckId, i (deckId)}
                <div class="deck-item-wrapper"
                     role="button"
                     tabindex="0"
                     style={dragDropManager?.isDragging ? 'transition: all 0.2s ease;' : ''}
                     onpointermove={(e) => dragDropManager?.handleDragMove(e, i)}>
                    <div class="deck-card-container"
                         role="button"
                         tabindex="0"
                         onpointerdown={(e) => dragDropManager?.handleDragStart(e, i)}
                         onpointerup={(e) => dragDropManager?.handleDragEnd(e, i)}>
                             
                        {#if isReordering}
                            <div class="drag-handle" 
                                 title="Click and drag to reorder">
                                <i class="fa-solid fa-grip-vertical"></i>
                            </div>
                        {/if}
                        
                        {@render deckCard(app.getDeckInfo(deckId), isReordering)}
                        
                        {#if !isReordering}
                            <a class="deck-card-button" href="{base}/deck?id={deckId}" title="Deck Info" aria-label="Deck Info">
                                <i class="fa-solid fa-list"></i>
                            </a>
                        {/if}
                    </div>
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

{#snippet deckCard(info: typeof DeckInfo[number], disable: boolean)}
    <a class="deck-card" class:disabled={disable} href="{base}/overview?id={info.id}" draggable="false">
        <div class="deck-card-info">
            <div class="left">
                <span class="deck-card-title">{info.title}</span>
                <span 
                    class="deck-card-subtitle"
                    style={`--subtitle-color: ${info.color ?? '#00000080'}`}
                >{info.subtitle}</span>
            </div>
            <div class="right" class:no-new={isSeparateLearnAndReview}>
                <span class="deck-count-learn-relearn" title="learning">
                    {app.recursiveMetaDeckCount(info.id, app.getLearningRelearningCardsCount.bind(app)) || ''}
                </span>
                <span class="deck-count-review" title="review">
                    {app.recursiveMetaDeckCount(info.id, app.getScheduledReviewCardsCount.bind(app)) || ''}
                </span>
                <span class="deck-count-new" title="new">
                    {app.recursiveMetaDeckCount(info.id, app.getScheduledNewOrWarmUpCardsCount.bind(app)) || ''}
                </span>
                <span class="deck-count-previously-studied" title="previously studied">
                    {app.recursiveMetaDeckCount(info.id, app.getScheduledPreviouslyStudiedCardsCount.bind(app)) || ''}
                </span>
            </div>
        </div>
        {#if isShowLastStudied}
            <div class="deck-card-last-studied">
                Last Studied: 
                {getDeckLastStudiedString(info.id)}
            </div>
        {/if}
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
    .data-export-reminder {
        background-color: #FFFFFF90;
        border: 1px solid #00000020;
        border-radius: 0.5em;
        width: calc(100vw - 2em);
        max-width: 30em;
        margin-bottom: 1em;
        padding: 0.75em;
        color: inherit;

        .reminder-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75em;
        }

        .reminder-toggle {
            all: unset;
            cursor: pointer;
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75em;
        }

        .title {
            font-weight: bold;
            display: inline-flex;
            gap: 0.5em;
            align-items: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .export-now-button {
            margin-top: 0;
            white-space: nowrap;
        }

        .details {
            margin-top: 0.75em;
        }

        .last-exported {
            margin-top: 0.5em;
            font-size: 0.9em;
            opacity: 0.9;
        }

        .actions {
            margin-top: 0.75em;
            display: flex;
            flex-direction: column;
            gap: 0.5em;
        }
    }
    .hr {
        width: calc(100vw - 2em);
        max-width: 24em;
        height: 1px;
        background-color: #00000090;
    }
    .deck-list-container {
        display: flex;
        flex-direction: column;
        margin-top: 0.5em;
        gap: 1em;
    }

    .deck-item-wrapper {
        width: calc(100vw - 2em);
        max-width: 30em;
        border-radius: 0.5em;
        transition: all 0.2s ease;
    }

    .deck-card-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5em;
        width: 100%;
        border-radius: 0.5em;
    }
    
    .drag-handle {
        cursor: grab;
        color: #999;
        padding: 0.25em;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.3em;
        transition: all 0.2s ease;
        touch-action: none; /* Prevent all browser touch behaviors on the drag handle */
    }
    
    .drag-handle:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #666;
    }
    
    .drag-handle:active {
        cursor: grabbing;
    }
    .deck-card {
        all: unset;
        background-color: #FFFFFF90;
        border-radius: 0.5em;
        padding: 1em;
        flex-grow: 1;
        /*display: flex;*/
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        gap: 1em;
        
        &.disabled {
            pointer-events: none;
        }
    }
    .deck-card-info {
        all: unset;
        flex-grow: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        gap: 1em;
        
        .deck-card-title {
            font-weight: bold;
        }
        .deck-card-subtitle {
            color: #00000080;
            color: var(--subtitle-color, #00000080);
            font-size: 0.9em;
        }
        .right {
            color: var(--wenbun-blue);
        }
    }
    .deck-card-last-studied {
        margin-top: 0.2em;
        font-size: 0.9em;
        opacity: 0.4;
    }
    .deck-card {
        .right {
            display: grid;
            gap: 0.5em;
            grid-template-columns: 1.5em 1.5em 1.5em 1.5em;
            .deck-count-learn-relearn {
                place-self: center;
                color: var(--wenbun-red)
            }
            .deck-count-review {
                place-self: center;
                color: var(--wenbun-green)
            }
            .deck-count-new {
                place-self: center;
                color: var(--wenbun-blue);
            }
            .deck-count-previously-studied {
                place-self: center;
                color: var(--wenbun-orange);
            }
            &.no-new {
                grid-template-columns: 1.5em 1.5em 1.5em;
                .deck-count-new {
                    display: none;
                }
            }
        }
    }
    .deck-card-button {
        all: unset;
        color: white;
        background-color: var(--wenbun-blue);
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
        align-items: center;
    }
    .a-button {
        all: unset;
        position: relative;
        display: block;
        background-color: #FFFFFF90;
        width: calc(100vw - 4em);
        max-width: 20em;
        border-radius: 0.5em;
        padding: 1em;
        cursor: pointer;
    }
    .update-circle {
        position: absolute;
        top: -0.3em;
        right: -0.4em;
        width: 1.5em;
        height: 1.5em;
        background-color: var(--wenbun-red);
        border-radius: 50%;
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
        margin-top: 0.5em;
    }
    .top-button-container {
        .button {
            margin-top: 0;
        }
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.5em;
        width: calc(100vw - 2em);
        max-width: 24em;
    }
    a {
        color: var(--wenbun-blue);
    }
</style>
