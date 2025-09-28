<script lang="ts">
    import { base } from '$app/paths';
    import { goto } from '$app/navigation';
    import { get } from 'svelte/store';
    import { navigationHistory, canGoBack } from '$lib/navigation';
    import { ManualSyncStatus } from '$lib/profile';

    interface Props {
		title: string;
		noBack?: boolean;
		backUrl?: string; // override
		prohibitedBackUrl?: string;
		isSettings?: boolean;
		backConfirmCallback?: () => Promise<boolean>;
		// sync
		syncStatus?: ManualSyncStatus;
		isSyncing?: boolean; // animation
		syncButtonCallback?: () => Promise<void>;
	}
    let { 
        title, noBack, backUrl, prohibitedBackUrl, isSettings, backConfirmCallback,
        syncStatus, syncButtonCallback, isSyncing,
    }: Props = $props();
    
    function goBack() {
        const performBackNavigation = () => {
            if (backUrl) {
                navigationHistory.popWithoutGoingBack();
                goto(backUrl);
            } else if (get(canGoBack)) {
                navigationHistory.back(prohibitedBackUrl);
            } else {
                goto(base + '/');
            }
        };

        if (backConfirmCallback) {
            backConfirmCallback().then((confirmed) => {
                if (confirmed) performBackNavigation();
            });
        } else {
            performBackNavigation();
        }
    }
</script>

<div class="top-bar-placeholder"></div>
<div class="top-bar">
    <div class="left">
        {#if !noBack}
            <button class="icon-button" onclick={goBack} title="Back" aria-label="Back">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
        {/if}
    </div>
    <div class="center">
        <span class="title">{title}</span>
    </div>
    <div class="right">
        {#if syncStatus}
            <button class="icon-button sync" aria-label="Sync" onclick={() => syncButtonCallback?.()}>
                <i class="fa-solid fa-rotate" class:syncing={isSyncing}></i>
                {#if !isSyncing}
                    <div class="sync-status-badge">
                        {#if syncStatus === ManualSyncStatus.canPull || syncStatus === ManualSyncStatus.canPush}
                            <div class="red-dot"></div>
                        {:else if syncStatus === ManualSyncStatus.conflict}
                            <div class="badge">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                            </div>
                        {/if}
                    </div>
                {/if}
            </button>
        {/if}
        {#if !isSettings}
            <a class="icon-button" href="{base}/settings" title="Settings" aria-label="Settings">
                <i class="fa-solid fa-gear"></i>
            </a>
        {/if}
    </div>
</div>

<style>
    .top-bar-placeholder {
        height: 2em;
        margin-bottom: 1em;
    }
    .top-bar {
        position: fixed;
        top: 0;
        left: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 2em;
        background-color: var(--wenbun-blue);
        padding: 0.5em;
        color: white;
        z-index: 99999;
    }
    .right {
        margin-right: 1em;
    }
    .center {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
    }
    .icon-button {
        all: unset;
        cursor: pointer;
        padding: 0.5em 1em;
        border-radius: 0.5em;
        @media (max-width: 600px) {
            padding: 0.5em 0.5em;
        }
    }
    .icon-button:hover {
        background-color: #00000050;
    }
    .icon-button.sync {
        position: relative;
    }
    .sync-status-badge {
        position: absolute;
        right: 0.5em;
        top: 0.5em;
    }
    .badge {
        color: var(--wenbun-orange);
        font-size: 0.8em;
    }
    .red-dot {
        width: 0.5em;
        height: 0.5em;
        background-color: var(--wenbun-red);
        border-radius: 50%;
    }
    .syncing {
        opacity: 0.5;
        animation: rotate 1s ease-in-out infinite;
    }
    
    @keyframes rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(180deg); }
    }
</style>