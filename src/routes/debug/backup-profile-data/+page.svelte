<script lang="ts">
    import { App } from "$lib/app";
    import { onMount } from "svelte";
    
    let app = new App();
</script>

{#await app.profile.getBackupProfileDataBeforeLogin()}
{:then data}
    {#if data === null}
        null
    {:else}
        {data}
    {/if}
{/await}