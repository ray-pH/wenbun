<script lang="ts">
    import { App } from "$lib/app";
    import Loading from "$lib/components/Loading.svelte";
    
    let app = new App();
</script>

{#await app.profile.getBackupProfileDataBeforeLogin()}
    <Loading></Loading>
{:then data}
    {#if data === null}
        null
    {:else}
        {data}
    {/if}
{/await}