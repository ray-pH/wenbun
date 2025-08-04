<script lang="ts">
    import { base } from '$app/paths';
    import TopBar from '$lib/components/TopBar.svelte';
</script>

<TopBar title="About" backUrl="{base}/"></TopBar>
<div class="container">
    <div class="beta-notice">
        <p>
            Wenbun is currently in beta. We need your feedback to improve!<br>
            Please join our community server to share your thoughts, report bugs, and stay updated.
        </p>
        <a class="button" href="https://discord.gg/Ab25UgysDt" aria-label="Discord Community Server" target="_blank">
            <i class="fa-brands fa-discord"></i>&nbsp;
            Discord Community Server
        </a>
    </div>
    <div class="changelog-container">
        Change log

        <h4>v0.3.0 (2025-08-04)</h4>
        <ul>
            <li>Add audio playback for Mandarin and Cantonese</li>
            <div class="note">
                For Mandarin words without any audio recordings (the uncommon ones), we can still generate the audio by stitching together per-syllable audio. We haven't been able to find a good syllable dataset for Cantonese yet.
            </div>
        </ul>
        
        <h4>v0.2.0 (2025-08-02)</h4>
        <ul>
            <li>Add Mandarin alternative readings (numeric and zhuyin)</li>
            <li>Add Cantonese support and Cantonese decks</li>
            <li>Add support for Traditional characters and Chinese decks</li>
            <li>Add a button to "Ignore" card in the new card view</li>
            <li>Warn user when they are about to lose unsaved changes from the settings page</li>
        </ul>
    </div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 1em;
        padding-top: 1em;
    }
    .beta-notice {
        display: flex;
        max-width: 32em;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin-bottom: 2em;
        gap: 0.5em;
        background-color: #FFFFFF90;
        padding: 2em;
        border-radius: 0.5em;
    }
    .changelog-container {
        max-width: 32em;
    }
    .note {
        background-color: #f0f0f0;
        padding: 0.5em;
        border-radius: 0.3em;
        font-size: 0.9em;
        margin-top: 0.5em;
    }
    .button {
        all: unset;
        color: white;
        background-color: #3E92CC;
        border-radius: 0.5em;
        font-size: 0.9em;
        padding: 0.5em 1em;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        &:hover {
            opacity: 0.8;
        }
        &:disabled {
            background-color: gray;
            pointer-events: none;
        }
    }
</style>