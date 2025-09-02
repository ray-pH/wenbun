<script lang="ts">
    import { base } from '$app/paths';
    import { goto } from '$app/navigation';
    import { get } from 'svelte/store';
    import { navigationHistory, canGoBack } from '$lib/navigation';

    interface Props {
		title: string;
		noBack?: boolean;
		backUrl?: string; // override
		prohibitedBackUrl?: string;
		isSettings?: boolean;
		backConfirmCallback?: () => Promise<boolean>;
	}
    let { title, noBack, backUrl, prohibitedBackUrl, isSettings, backConfirmCallback }: Props = $props();
    
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

<div class="top-bar-placeholder">hello</div>
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
    }
    .icon-button:hover {
        background-color: #00000050;
    }
</style>