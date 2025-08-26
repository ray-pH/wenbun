<script lang="ts">
    import { base } from '$app/paths';
    import TopBar from '$lib/components/TopBar.svelte';
</script>

<TopBar title="About"></TopBar>
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

        <h4>v0.8.2 (2025-08-27)</h4>
        <ul>
            <li>Take the warm-up phase into account when <b>calculating the distribution of the new cards</b>.</li>
            <div class="note">
                The calculation for the new card distribution previously didn't account for warm-up periods, causing new/warm-up cards to be grouped together at the end of a session. This has been fixed to ensure a more even distribution, while still supporting the option to skip the warm-up phase.
            </div>
            <li>Add an option to <b>not grade new/warm-up cards</b>.</li>
            <div class="note">
                When this option is disabled (which it is by default now), the system ensures that new and warm-up cards will be studied again the next day. Internally, this is achieved by automatically grading the <b>last</b> warm-up attempt as 'Fail/Again'.
            </div>
            <li>Fix due interval display.</li>
            <div class="note">
                Previously, the due interval display for failed cards was misleading (e.g., showing '2 days' after a second failure). This was a <b>display issue only</b>; the internal scheduling logic was already correctly set to 1 day. The fix corrects the displayed interval to <b>accurately reflect the scheduling</b>.
            </div>
        </ul>

        <h4>v0.8.1 (2025-08-26)</h4>
        <ul>
            <li>Fixed an issue with audio retrieval for Traditional Chinese characters.</li>
            <div class="note">
                This should fix the issue with custom deck uploads that use Traditional Chinese characters.
            </div>
        </ul>

        <h4>v0.8.0 (2025-08-24)</h4>
        <ul>
            <li><b>Custom Deck Upload</b>: Users can now upload their own decks in various formats, including Anki decks. A help page has been added for guidance.</li>
            <li><b>Deck Preview</b>: A new component to preview deck contents has been implemented.</li>
            <li>Improved <b>app navigation</b> with custom history for the back button.</li>
            <li>Added a badge to notify users of new <b>changelogs</b>.</li>
            <li>Updated default <b>stroke grading leniency</b> to 1.5.</li>
            <li>Fixed a bug where new card buttons were not saving progress.</li>
            <li>Behind the scenes:
                <ul>
                    <li>Added more character data for the character writer and an extra dictionary.</li>
                    <li>Improved Chinese Traditional character handling.</li>
                    <li>UI style improvements.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.7.0 (2025-08-21)</h4>
        <ul>
            <li>Added <b>UI scale</b> setting</li>
            <li>Added <b>auto-resolve</b> strategies for sync conflicts
                <div class="note">
                    These changes might break some saves for now, but it will improve the sync in the future. If any user is experiencing data loss, please contact the developer.
                </div>
            </li>
            <li>Improved <b>UI for smaller screens</b></li>
            <li>Changed default <b>stroke grading leniency</b> to 2.0</li>
            <li>Fixed <b>stroke grading leniency</b> setting not being applied properly</li>
            <li>Updated <b>font</b> for consistency across platforms</li>
            <li>Added <b>privacy policy</b> page</li>
        </ul>
        <div class="note">
            For users who were using the old default stroke grading leniency (1.0), it is advised to change it to 2.0 in the settings.
        </div>

        <h4>v0.6.3 (2025-08-17)</h4>
        <ul>
            <li><b>(Major Fix)</b> Updated <b>Chinese dictionary</b> and <b>HSK decks</b></li>
            <div class="note">
                While the HSK 7 deck is still incomplete, this update is being pushed out to deliver fixes for other decks sooner.<br>
                The previous dictionary's coverage for HSK v3.0 was only 70%.
                If you have already added the HSK v3.0 deck, you may still find a few entries missing due to the removal of deprecated words.
                An automatic fix for this issue will be included in a future update.
            </div>
            <li>Added an option to start reviews with the <b>back of the card showing first</b></li>
            <li>Added a <b>health-check page</b> for debugging</li>
        </ul>
        
        <h4>v0.6.2 (2025-08-16)</h4>
        <ul>
            <li><b>(Major Fix)</b> Fix <b>Warm-up Mode</b></li>
            <li>Added a button to <b>skip warm-up</b> for new cards</li>
        </ul>
        <div class="note">
            The latest updates apparently introduced a major bug for the new cards and the warm-up mode.
            We are sorry for the inconvenience. It should be fixed now
        </div>

        <h4>v0.6.1 (2025-08-15)</h4>
        <ul>
            <li>Improved <b>online sync stability</b> and error handling</li>
            <li>Fixed a bug in the <b>deck browser</b></li>
        </ul>

        <h4>v0.6.0 (2025-08-14)</h4>
        <ul>
            <li>Add <b>online sync</b> (Google login)</li>
            <li>Update <b>character writer</b> drawing width and color</li>
            <li>Various <b>architecture improvements</b></li>
        </ul>
        <div class="note">
            In this early beta stage, before logging in, it is recommended to manually backup your save first 
            by clicking on <b>export profile data</b> and storing it somewhere safe.
        </div>
            
        <h4>v0.5.1 (2025-08-10)</h4>
        <ul>
            <li>Added <b>stroke grading leniency</b> setting and <b>calibration page</b></li>
            <li>Update <b>character writer</b> user stroke width</li>
        </ul>
            
        <h4>v0.5.0 (2025-08-09)</h4>
        <div class="note">
            It is advised for users to click "reset to default settings" in the settings. Or, if setting to auto grading mode, it's advised to disable short-term scheduling in FSRS settings.
        </div>
        <ul>
            <li>Implement <b>auto-grading</b> for reviews</li>
            <div class="note">
                The grade can be overridden by clicking on the grade.<br>
                "Easy" will not appear as an automatic grade.<br>
                The parameters for auto-grading may change in the future.
            </div>
            <li>Add <b>warm-up mode</b> for new cards</li>
            <li>Play audio only once in the <b>new card view</b></li>
            <li>Fix <b>due-date filtering</b> for review and learning/relearning cards</li>
            <li>Various <b>UI/UX improvements</b> and bug fixes</li>
        </ul>

        <h4>v0.4.0 (2025-08-06)</h4>
        <ul>
            <li>Add <b>Extra Study</b> feature with configurable study modes</li>
            <li>Add <b>deck progress tracking</b> and visualize it with a progress bar on the overview page</li>
            <li>Add <b>text on hover</b> for deck numbers on the main page</li>
        </ul>
        
        <h4>v0.3.0 (2025-08-04)</h4>
        <ul>
            <li>Add <b>audio playback</b> for Mandarin and Cantonese</li>
            <div class="note">
                For Mandarin words without any audio recordings (the uncommon ones), we can still generate the audio by stitching together per-syllable audio. We haven't been able to find a good syllable dataset for Cantonese yet.
            </div>
        </ul>
        
        <h4>v0.2.0 (2025-08-02)</h4>
        <ul>
            <li>Add Mandarin <b>alternative readings</b> (numeric and zhuyin)</li>
            <li>Add <b>Cantonese support</b> and Cantonese decks</li>
            <li>Add support for <b>Traditional characters</b> and Chinese decks</li>
            <li>Add a button to <b>"Ignore" card</b> in the new card view</li>
            <li>Warn user when they are about to <b>lose unsaved changes</b> from the settings page</li>
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

    .privacy-policy-link {
        margin-top: 2em;
        font-size: 0.9em;
    }
    
    .privacy-policy-link a {
        color: #3e92cc;
    }
</style>