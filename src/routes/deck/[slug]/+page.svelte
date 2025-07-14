<script lang="ts">
    import { App } from "$lib/app";
    import { onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";

    export let data: {slug?: string};
    let deckId = data.slug || '';
    
    let app = new App();
    onMount(async () => {
        await app.init();
        app = app;
    })
    
    $: deckData = app.deckData[deckId];
    $: groups = deckData?.groups ?? {};
    $: groupNames = Object.keys(groups);
    
    let accordionState = new SvelteMap<string, boolean>();
    function toggleAccordion(id: string) {
        accordionState.set(id, !accordionState.get(id));
        accordionState = accordionState;
    }
</script>


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
                        {#each groups[groupName] as word}
                            {app.getCardWord(deckId, word)}
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
    }
    .group-container {
        display: flex;
        flex-direction: row;
    }
    .group {
        width: 30em;
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
</style>