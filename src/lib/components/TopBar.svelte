<script lang="ts">
    interface Props {
		title: string;
		backUrl?: string
		isSettings?: boolean
	}
    let { title, backUrl, isSettings }: Props = $props();
</script>

<div class="top-bar-placeholder">hello</div>
<div class="top-bar">
    <div class="left">
        {#if backUrl}
            <a class="icon-button" href={backUrl} title="Back" aria-label="Back">
                <i class="fa-solid fa-chevron-left"></i>
            </a>
        {/if}
    </div>
    <div class="center">
        <span class="title">{title}</span>
    </div>
    <div class="right">
        {#if !isSettings}
            <a class="icon-button" href="/settings" title="Settings" aria-label="Settings">
                <i class="fa-solid fa-gear"></i>
            </a>
        {/if}
    </div>
</div>

<style>
    .top-bar-placeholder {
        height: 2em;
        margin-bottom: 3em;
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
        background-color: #3E92CC;
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