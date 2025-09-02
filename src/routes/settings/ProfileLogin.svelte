<script lang="ts">
    import { type App} from "$lib/app";
    import Loading from "$lib/components/Loading.svelte";
    import type { SyncConflictInfo } from "$lib/profile";
    import { onMount } from "svelte";
    
    export let app: App;
    export let isLoggedIn = false;
    export let isOnlineProfileLoaded = false;
    let name: string = "";
    
    let isSyncConflict = false;
    let syncConflictInfo: SyncConflictInfo | undefined;
    let isAutomaticallyLoggedOut = false;
    
    onMount(() => {
        updateState();
    })
    function updateState() {
        if (app) {
            isLoggedIn = app.profile.isLoggedIn;
            name = app.profile.getName();
            isSyncConflict = app.profile.isSyncConflict;
            syncConflictInfo = app.profile.syncConflictInfo;
            isAutomaticallyLoggedOut = app.profile.isAutomaticallyLoggedOut();
        }
    }
    
    function conflictUseRemote() {
        const confirm = window.confirm("Are you sure you want to use the remote version? (This will overwrite your local save)");
        if (!confirm) return;
        app.profile.tryForcePull(app).then(() => updateState());
    }
    function conflictUseLocal() {
        const confirm = window.confirm("Are you sure you want to use the local version? (This will overwrite your remote save)");
        if (!confirm) return;
        app.profile.tryForcePush(app).then(() => updateState());
    }
    function loginGoogle() {
        app.profile.loginGoogle(app);
    }
    function logout() {
        app.profile.logout(app);
    }
    
    function stayLoggedOut() {
        const confirm = window.confirm('Are you sure you want to stay logged out? You might need to sync manually later');
        if (!confirm) return;
        app.profile.updateLoginStatus(undefined);
        isAutomaticallyLoggedOut = app.profile.isAutomaticallyLoggedOut();
    }
</script>

<div class="container">
    <div class="title">Online Sync</div>
    <hr>
    {#if !isOnlineProfileLoaded}
        <Loading/>
    {:else if isLoggedIn}
        <div>
            Logged in as <span class="name">{name}</span>
        </div>
        <button class="button" onclick={logout}>
            <i class="fa-solid fa-right-from-bracket"></i>&nbsp;
            Log out
        </button>
        
        {#if isSyncConflict}
            <div class="sync-conflict-container">
                <div class="warning">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Sync Failed, conflict detected. <br>
                    Please select whether to use the remote or local version.
                    <div class="note" style="font-size: 1em; margin-top: 0.5em;">
                        <i class="fa-solid fa-circle-info"></i>
                        If not sure, use the <b>Remote</b> version. <br>
                        If this is happening too often, please report to the developer.
                    </div>
                </div>
                {#if syncConflictInfo}
                    <div class="sync-conflict-info">
                        <div class="sync-conflict-info-item">
                            <span class="label"><b>Remote</b> modified at:</span>
                            <span class="value">{syncConflictInfo.remoteModifiedAt.toLocaleString()}</span>
                        </div>
                        <div class="sync-conflict-info-item">
                            <span class="label"><b>Local</b> modified at:</span>
                            <span class="value">{syncConflictInfo.localModifiedAt.toLocaleString()}</span>
                        </div>
                        <div class="sync-conflict-info-item">
                            <span class="label">Last Sync Time:</span>
                            <span class="value">{syncConflictInfo.lastSyncTime.toLocaleString()}</span>
                        </div>
                    </div>
                {/if}
                <button class="button" onclick={conflictUseRemote}>
                    <i class="fa-solid fa-download"></i>&nbsp;
                    Use Remote
                </button>
                <button class="button" onclick={conflictUseLocal}>
                    <i class="fa-solid fa-upload"></i>&nbsp;
                    Use Local
                </button>
            </div>
        {/if}
    {:else}
        {#if isAutomaticallyLoggedOut}
            <i class="fa-solid fa-circle-info" style="color: var(--wenbun-blue);"></i>
            <p>
                You are <b>unexpectedly logged out</b> due to session expiration or server issue.
                Try logging in again.
            </p>
            <p class="note">(*Please report to the developer if this happens frequently.)</p>
            <button class="button invert fullwidth" onclick={stayLoggedOut}>
                <i class="fa-solid fa-ban"></i>&nbsp;
                Dismiss (Stay Logged Out)
            </button>
        {/if}
        <div>
            <p class="note">
                <i class="fa-solid fa-circle-info"></i>
                In this early beta stage, before logging in, it is recommended to manually backup your save first 
                by clicking on <b>export profile data</b> and storing it somewhere safe.
            </p>
        </div>
        <button class="button fullwidth" onclick={loginGoogle}>
            <i class="fa-brands fa-google"></i>&nbsp;
            Log in with Google
        </button>
    {/if}
    
</div>

<style>
    
    .container {
        background-color: #FFFFFF90;
        padding: 1em;
        border-radius: 0.5em;
    }
    hr {
        opacity: 0.2;
    }
    .title {
        margin-bottom: 0.5rem;
    }
    
    .name {
      font-weight: bold;
    }
    
    .warning {
        background-color: #e6c46d;
        padding: 0.5em;
        margin: 1em 0;
        border-radius: 0.5em;
        font-size: 0.9em;
    }
    
    .label {
        color: #00000090;
        b {
            color: black;
        }
    }
    
    .sync-conflict-info-item {
        font-size: 0.9em;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .button {
        margin-top: 0.5em;
    }
    .note {
        font-size: 0.9em;
        color: #00000090;
    }
    .fullwidth {
        width: 100%;
        box-sizing: border-box;
    }
</style>