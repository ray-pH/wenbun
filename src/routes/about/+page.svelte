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
        <a class="button" href="https://discord.gg/pVUuqJqywt" aria-label="Discord Community Server" target="_blank">
            <i class="fa-brands fa-discord"></i>&nbsp;
            Discord Community Server
        </a>
    </div>
    <div class="changelog-container">
        Change log

        <h4>v0.7.0 (2025-08-21)</h4>
        <ul>
            <li>Added UI scale setting</li>
            <li>Added auto-resolve strategies for sync conflicts</li>
            <li>Improved UI for smaller screens</li>
            <li>Changed default stroke grading leniency to 2.0</li>
            <li>Fixed stroke grading leniency setting not being applied properly</li>
            <li>Updated font for consistency across platforms</li>
            <li>Added privacy policy page</li>
        </ul>
        <div class="note">
            For users who were using the old default stroke grading leniency (1.0), it is advised to change it to 2.0 in the settings.
        </div>

        <h4>v0.6.3 (2025-08-17)</h4>
        <ul>
            <li><b>(Major Fix)</b> Updated Chinese dictionary and HSK decks</li>
            <div class="note">
                While the HSK 7 deck is still incomplete, this update is being pushed out to deliver fixes for other decks sooner.<br>
                The previous dictionary's coverage for HSK v3.0 was only 70%.
                If you have already added the HSK v3.0 deck, you may still find a few entries missing due to the removal of deprecated words.
                An automatic fix for this issue will be included in a future update.
            </div>
            <li>Added an option to start reviews with the back of the card showing first</li>
            <li>Added a health-check page for debugging</li>
        </ul>
        
        <h4>v0.6.2 (2025-08-16)</h4>
        <ul>
            <li><b>(Major Fix)</b> Fix Warm-up Mode</li>
            <li>Added a button to skip warm-up mode for new cards</li>
        </ul>
        <div class="note">
            The latest updates apparently introduced a major bug for the new cards and the warm-up mode.
            We are sorry for the inconvenience. It should be fixed now
        </div>

        <h4>v0.6.1 (2025-08-15)</h4>
        <ul>
            <li>Improved online sync stability and error handling</li>
            <li>Fixed a bug in the deck browser</li>
        </ul>

        <h4>v0.6.0 (2025-08-14)</h4>
        <ul>
            <li>Add online sync (Google login)</li>
            <li>Update character writer drawing width and color</li>
            <li>Various architecture improvements</li>
        </ul>
        <div class="note">
            In this early beta stage, before logging in, it is recommended to manually backup your save first 
            by clicking on <b>export profile data</b> and storing it somewhere safe.
        </div>
            
        <h4>v0.5.1 (2025-08-10)</h4>
        <ul>
            <li>Added stroke grading leniency setting and calibration page</li>
            <li>Update character writer user stroke width</li>
        </ul>
            
        <h4>v0.5.0 (2025-08-09)</h4>
        <div class="note">
            It is advised for users to click "reset to default settings" in the settings. Or, if setting to auto grading mode, it's advised to disable short-term scheduling in FSRS settings.
        </div>
        <ul>
            <li>Implement auto-grading for reviews</li>
            <div class="note">
                The grade can be overridden by clicking on the grade.<br>
                "Easy" will not appear as an automatic grade.<br>
                The parameters for auto-grading may change in the future.
            </div>
            <li>Add warm-up mode for new cards</li>
            <li>Play audio only once in the new card view</li>
            <li>Fix due-date filtering for review and learning/relearning cards</li>
            <li>Various UI/UX improvements and bug fixes</li>
        </ul>

        <h4>v0.4.0 (2025-08-06)</h4>
        <ul>
            <li>Add Extra Study feature with configurable study modes</li>
            <li>Add deck progress tracking and visualize it with a progress bar on the overview page</li>
            <li>Add text on hover for deck numbers on the main page</li>
        </ul>
        
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
    <div class="privacy-policy-link">
        <a href="{base}/privacy">Privacy Policy</a>
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

    .privacy-policy-link {
        margin-top: 2em;
        font-size: 0.9em;
    }
    
    a {
		color: #3e92cc;
	}
</style>