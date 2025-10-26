<script lang="ts">
    import { apiFetch, ApiRoute, apiUrl } from "$lib/api";
    import Loading from "$lib/components/Loading.svelte";
import TopBar from "$lib/components/TopBar.svelte";
    import { onMount } from "svelte";
    
    export let data: {token: string};
    
    async function sendDeleteRequest(): Promise<boolean> {
        const res = await apiFetch(apiUrl(ApiRoute.AccountDelete, {token: data.token}), {
            method: "GET",
        });
        return res.ok;
    }
</script>

<TopBar title="Delete Account" />
<div class="container">
    {#await sendDeleteRequest()}
        <Loading></Loading>
    {:then success} 
        {#if success}
            <p>Account deleted successfully.</p>
        {:else}
            <p>Failed to delete account. Please try again.</p>
        {/if}
    {/await}
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        width: 90vw;
        max-width: 24em;
        margin: auto;
        margin-bottom: 5em;
    }
</style>