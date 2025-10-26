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
    <div style="margin-bottom: 1em">
        <a class="button" href="{base}/credits" aria-label="Credits" style="padding-left: 8em; padding-right: 8em">
            Credits
        </a>
    </div>
    <div class="changelog-container">
        Changelog

        <h4>v0.19.0 (2025-10-27)</h4>
        <ul>
            <li><b>Android</b>:
                <ul>
                    <li>Fix google login</li>
                    <li>Fixed an issue where data was not being saved.</li>
                    <li>Updated icon background color.</li>
                </ul>
            </li>
            <li><b>Writer</b>: Added an experimental fix for the Apple Pencil (enable manually in settings).</li>
        </ul>

        <h4>v0.18.4 (2025-10-16)</h4>
        <ul>
            <li><b>Dictionary</b>: Added a setting to display a link to <b>Dong-Chinese</b> in the dictionary.</li>
        </ul>
        
        <h4>v0.18.3 (2025-10-14)</h4>
        <ul>
            <li><b>Deck</b>: Added <b>sorting</b> option in the table view</li>
        </ul>
        
        <h4>v0.18.2 (2025-10-13)</h4>
        <ul>
            <li><b>Bugfix</b>: fix issue where the <i>"You have done today’s review"</i> message appear unexpectedly</li>
        </ul>
       
        <h4>v0.18.1 (2025-10-06)</h4>
        <ul>
            <li><b>Offline Data</b>: added a button to clear downloaded data</li>
        </ul>

        <h4>v0.18.0 (2025-10-05)</h4>
        <ul>
            <li><b>Sync</b>:
                <ul>
                    <li>Improved the <b>sync conflict UI</b> to provide more detailed information about local and remote data.</li>
                    <li>The <b>sync button</b> is now hidden when the sync mode is set to <b>auto</b>.</li>
                </ul>
            </li>
            <li><b>Review</b>:
                Reduced the probability of getting the same card consecutively.
            </li>
            <li><b>Deck</b>:
                Added a summary of group statistics to the deck page.
            </li>
            <li><b>Dictionary</b>:
                Added a setting to display a link to <b>Pleco</b> in the dictionary.
            </li>
            <li><b>Settings</b>:
                Added a configuration option for the stroke fade duration in the character writer.
            </li>
            <li><b>Account</b>:
                Added a form to request account deletion.
            </li>
        </ul>

        <h4>v0.17.0 (2025-09-29)</h4>
        <ul>
            <li><b>Domain Migration</b>:
                <ul>
                    <li>The app has been migrated to a new domain: <a href="https://app.wenbun.com" target="_blank">app.wenbun.com</a>. A notice will be displayed on the old domain to guide users to the new address.</li>
                </ul>
            </li>
            <li><b>PWA & Offline Mode</b>:
                <ul>
                    <li>The app can now be installed as a PWA (Progressive Web App) for offline use.</li>
                    <li>Added an "<b>Install as PWA</b>" button in the settings.</li>
                    <li>Added an "<b>Offline Data</b>" page to manage offline assets, including core data and audio files.</li>
                </ul>
            </li>
            <li><b>Sync</b>:
                <ul>
                    <li>Added a <b>manual sync</b> mode. Users can now choose between automatic and manual synchronization.</li>
                </ul>
            </li>
            <li><b>Audio</b>:
                <ul>
                    <li>The audio library has been updated to be more extensive.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.16.2 (2025-09-25)</h4>
        <ul>
            <li><b>Bug Fix</b>: Improve the stability of the syncing process by adding a tolerance to the time difference check.</li>
        </ul>

        <h4>v0.16.1 (2025-09-18)</h4>
        <ul>
            <li><b>Audio</b>: Reduced the delay for per-syllable audio playback.</li>
            <li><b>Bug Fixes</b>:
                <ul>
                    <li>The "Play Success Sound" setting now works as expected.</li>
                    <li>Audio no longer plays on completion in dictation mode.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.16.0 (2025-09-17)</h4>
        <ul>
            <li><b>Decks</b>: You can now add new cards to existing custom decks in bulk from the "Upload Custom Deck" page.</li>
            <li><b>Reviews</b>: Added a setting to configure how many times you can miss a stroke before a hint is shown.</li>
            <li><b>Bug Fix</b>: Fixed an issue where words with custom readings and meanings but no dictionary entry would not be handled correctly.</li>
        </ul>

        <h4>v0.15.0 (2025-09-16)</h4>
        <ul>
            <li>Added an option to separate the <b>"learn"</b> and <b>"review"</b> sessions.</li>
            <li>Fixed a bug where the study button remained grey after a quick adjustment.</li>
        </ul>
        
        <h4>v0.14.2 (2025-09-14)</h4>
        <ul>
            <li>Fix profile sync issue for devices with slower connections, caused by login status is not properly updated in review page.</li>
        </ul>
        
        <h4>v0.14.1 (2025-09-14)</h4>
        <ul>
            <li>Fix issue with reporting logic for session expiration auto-logout.</li>
        </ul>
        <div class="note">
            Alongside this update, user are advised to <b>check if they have been auto-logged out</b> due to session expiration.
            <br><br>
            If the logout happened <b>before this update</b>, the "auto-logged out" message will not appear.
            In that case <b>try logging in again</b>. If you experience data loss after logging in again, please contact the developer.
        </div>

        <h4>v0.14.0 (2025-09-13)</h4>
        <ul>
            <li><b>Deck Management</b>:
                <ul>
                    <li>Users can now reorder decks on the main page.</li>
                </ul>
            </li>
            <li><b>Review</b>:
                <ul>
                    <li>Added a new "All Cards" type for extra study.</li>
                    <li>The new card interface is no longer shown during extra study sessions.</li>
                    <li>In dictation mode, users can now reveal the reading and meaning of a card.</li>
                </ul>
            </li>
            <li><b>Character Writer</b>:
                <ul>
                    <li>Fixed a bug where the stroke animation speed was not applied immediately.</li>
                </ul>
            </li>
            <li><b>Settings</b>:
                <ul>
                    <li>Updated the confirmation message when leaving with unsaved changes to be more explicit.</li>
                </ul>
            </li>
            <li><b>Chinese Audio</b>:
                <ul>
                    <li>Fixed an issue where empty recording data could cause problems.</li>
                </ul>
            </li>
            <li><b>UI/UX Bug Fix</b>:
                <ul>
                    <li>The TopBar's z-index has been increased to prevent it from being overlapped by other elements.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.13.0 (2025-09-11)</h4>
        <ul>
            <li><b>Deck Management</b>:
                <ul>
                    <li>Added the ability to <b>add new empty cards</b> to custom decks from the table edit view.</li>
                    <li>Added the ability to <b>modify words</b> in custom decks from the table edit view.</li>
                    <li>Added the ability to <b>delete cards</b> from custom decks.</li>
                </ul>
            </li>
            <li>Implemented experimental <b>dictation mode</b> for extra study sessions.</li>
            <div class="note">
                In this mode, the audio is played instead of the meaning being shown.
            </div>
            <li>Updated the <b>audio dictionary</b> to remove some bad quality audio files.</li>
            <li>Fixed the "HSK 7" deck label to be "HSK 7-9".</li>
            <li><b>Settings</b>:
                <ul>
                    <li>Added an option to <b>disable the 'ding' sound</b> when a character is answered correctly.</li>
                    <li>Added an option to <b>force stop the audio</b> of the current card when moving to the next one.</li>
                    <div class="note">
                        The new default behavior is audio can still "bleed" into the next card, but user can disable it if they want.
                    </div>
                </ul>
            </li>
            <li><b>Bug Fixes</b>:
                <ul>
                    <li>Fixed an issue where manually importing a profile from a string would fail.</li>
                    <li>Character Writer Now shows a warning if a word contains characters not supported by the writer, and allows the user to ignore the card.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.12.2 (2025-09-09)</h4>
        <ul>
            <li>
                <b>Bug fix</b>: fix issue with profile sync conflict when adding new decks.
            </li>
        </ul>

        <h4>v0.12.1 (2025-09-09)</h4>
        <ul>
            <li>
                <b>Bug fix</b>: fix issue when adding a built-in deck, the deck id and label are mixed up.
            </li>
        </ul>
        
        <h4>v0.12.0 (2025-09-09)</h4>
        <ul>
            <li>Allow <b>custom dictionary entry</b> per deck</li>
            <div class="note">
                <b>Reading</b> and <b>Meaning</b> can be edited in deck page by selecting the <b>table edit</b> view.
            </div>
            <li>Implemented <b>table view</b> for decks.</li>
            <li>Implemented <b>table edit view</b> for decks.</li>
            <div class="note">
                Currently it's still limited. Ability to add/remove will be added in the future.
            </div>
            <li>Add option to enable <b>"health bar"</b> in review.</li>
            <li><b>Stops audio</b> from playing when transitioning to the next card.</li>
        </ul>

        <h4>v0.11.0 (2025-09-06)</h4>
        <ul>
            <li><b>Dictionary</b>:
                <ul>
                    <li>Allowed <b>clicking on characters</b> within the dictionary.</li>
                    <li>Added a <b>components</b> field to dictionary entries.</li>
                    <li>Added <b>notes</b> for some components.</li>
                </ul>
            </li>
            <li><b>Deck</b>:
                <ul>
                    <li>Added the ability to <b>rename custom decks</b>.</li>
                    <li>Added the ability to <b>move cards</b> between groups within decks.</li>
                    <li>Added the ability to create <b>custom groups</b> within decks.</li>
                </ul>
            </li>
            <li><b>Review</b>:
                <ul>
                    <li>Fixed a UI bug where the <b>bottom buttons were pushed up</b>.</li>
                    <li>Fixed an issue where the "Fail" pop-up would <b>block strokes</b>.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.10.1 (2025-09-04)</h4>
        <ul>
            <li>Updated the credits page</li>
            <li><b>Bug Fixes</b>:
                <ul>
                    <li>Fixed an issue where audio from the previous word would play during a review.</li>
                    <li>Fixed an issue on mobile browsers where the gesture to close the dictionary would conflict with the browser's pull-to-refresh feature.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.10.0 (2025-09-04)</h4>
        <ul>
            <li><b>Dictionary</b>: Initial implementation of the in-app dictionary.</li>
            <div class="note">
                We are still considering the best way to implement additional fields, such as example sentences.
            </div>
            <li><b>Credits Page</b>: Added a new page to acknowledge contributors.</li>
            <li><b>UI/UX Improvements</b>:
                <ul>
                    <li>Updated the UI for when a review session is completed.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.9.1 (2025-09-02)</h4>
        <ul>
            <li><b>Character Writer</b>: The drawing area has been updated to remove the outer padding, making the entire white region drawable.</li>
            <li><b>Bug Fixes</b>:
                <ul>
                    <li>Fixed an issue where the "Reveal" button would still be visible after a word was completed in a review.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.9.0 (2025-09-01)</h4>
        <ul>
            <li><b>Mark/Reveal Buttons</b>: Added buttons to mark a card as unsuccessful or reveal it during a review.</li>
            <li><b>Stroke Speed</b>: Added an option to control the animation speed for the character writer.</li>
            <li><b>Quick Adjust for Daily Limits</b>: Added a feature to quickly adjust today's card limits directly from the overview page.</li>
            <li><b>Extra Study from Deck Selection</b>: Users can now initiate an "Extra Study" session directly from the deck selection/browser page.</li>
            <li><b>Multi-Group Selection</b>: Enabled card selection across different groups within the deck browser.</li>
            <li><b>UI/UX Improvements</b>:
                <ul>
                    <li>The "Extra Study" section on the overview page is now an accordion to save space.</li>
                    <li>Implemented a new, more compact view for the deck browser.</li>
                    <li>Fixed an issue on iOS where the browser would auto-zoom on input fields.</li>
                    <li>Improved touch interactions for the character writer on mobile.</li>
                </ul>
            </li>
            <li><b>Bug Fixes</b>:
                <ul>
                    <li>Fixed the "Previously Studied" count display on the overview page.</li>
                    <li>Fixed an issue with the review schedule check logic.</li>
                </ul>
            </li>
        </ul>

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
        margin-bottom: 1em;
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
        color: var(--wenbun-blue);
    }
</style>