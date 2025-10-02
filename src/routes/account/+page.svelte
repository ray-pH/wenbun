<script lang="ts">
    import { App } from "$lib/app";
    import Loading from "$lib/components/Loading.svelte";
    import TopBar from "$lib/components/TopBar.svelte";
    import { Profile } from "$lib/profile";
    import { onMount } from "svelte";
    
    let inputEmail = '';
    let isSent = false;
    $: isValidEmail = inputEmail.length > 0 && inputEmail.includes('@');
    
    async function requestAccountDeletion() {
        await Profile.sendAccountDeletionRequest(inputEmail);
        isSent = true;
    }
</script>

<TopBar title="Account"></TopBar>
<div class="container">
    <div class="section">
        <div class="title">
            Request Account Deletion
        </div>
        <div>
            <span>
                Email Address: 
            </span>
            <input type="email" bind:value={inputEmail} disabled={isSent}>
            <div class="text-danger">
                A verification email will be sent to the address provided. Account deletion will only proceed once you confirm via that email.
            </div>
            <button class="button danger-button" onclick={() => requestAccountDeletion()} disabled={!isValidEmail || isSent}>
                <i class="fa-solid fa-trash-can"></i>&nbsp;
                Request Account Deletion
            </button>
        </div>
    </div>
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
    .section {
        margin-top: 2em;
        margin-bottom: 2em;
    }
    .title {
        font-size: 1.5em;
        font-weight: bold;
        margin-bottom: 1em;
    }
    input {
        width: 100%;
    }
    .text-danger {
        font-size: 0.9em;
        color: #00000090;
        margin: 1em 0;
    }
</style>