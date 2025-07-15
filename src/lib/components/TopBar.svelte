<script lang="ts">
    interface Props {
		title: string;
		backUrl?: string
	}
    let { title, backUrl }: Props = $props();
</script>

<div class="top-bar">
    <div class="left">
        {#if backUrl}
            <a class="icon-button" href={backUrl}>
                &lt;
            </a>
        {/if}
    </div>
    <div class="center">
        <span class="title">{title}</span>
    </div>
    <div class="right">
    </div>
</div>

<style>
    .top-bar {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
        min-height: 2em;
        background-color: #3E92CC;
        padding: 0.5em;
        color: white;
    }
    .left, .right {
        flex: 1;
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