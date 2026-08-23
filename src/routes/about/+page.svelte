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
    <div style="margin-bottom: 1em">
        <a class="button" href="{base}/faq" aria-label="FAQ" style="padding-left: 8em; padding-right: 8em">
            FAQ
        </a>
    </div>
    <div class="changelog-container">
        Changelog
        
        <h4>v0.28.6 (2026-08-23)</h4>
        <ul>
            <li>
                <b>Review</b>: Fix <b>Auto Next On Success</b> handling for new cards and extra study.
                <ul>
                    <li>New cards now progress through all warm-up steps before being scheduled.</li>
                    <li>Completed extra-study cards are now removed from the current extra-study session.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.28.5 (2026-08-03)</h4>
        <ul>
            <li>
                <b>Chinese import</b>: Fix tone coloring for pinyin containing <code>ü</code>/<code>v</code> forms.
                <ul>
                    <li>Preserve existing syllable boundaries for already spaced pinyin, preventing incorrect tone tags in words such as <code>旅行</code> (<code>lǚ xíng</code>), <code>忽略</code> (<code>hū luè</code>), and <code>虐待</code> (<code>nüè dài</code>).</li>
                    <li>Add unit tests for accent and numeric pinyin forms, including compact forms and apostrophe-separated syllables.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.28.4 (2026-05-30)</h4>
        <ul>
            <li>
                <b>Review</b>: Character writing in reviews now feels faster and smoother.
                <ul>
                    <li>Wenbun now prepares writing data ahead of time, so characters are ready sooner when you need them.</li>
                </ul>
            </li>
        </ul>

        <h4>v0.28.2 (2026-05-14)</h4>
        <ul>
            <li>
                <b>Character</b>: Patch more traditional characters that's not supported in hanzi writer.
                <div class="note">
                    <code>溼</code> -> <code>濕</code><br>
                    <code>揹</code> -> <code>背</code><br>
                    <code>嚐</code> -> <code>嘗</code><br>
                    <code>柺</code> -> <code>拐</code><br>
                    <code>譁</code> -> <code>嘩</code><br>
                    <code>絃</code> -> <code>弦</code><br>
                </div>
            </li>
        </ul>
        
        <h4>v0.28.1 (2026-05-12)</h4>
        <ul>
            <li>
                <b>Character</b>: Patch issue with <code>汙</code> not supported in hanzi writer. Use <code>污</code> variant instead.
            </li>
        </ul>

        <h4>v0.28.0 (2026-05-09)</h4>
        <ul>
            <li>
                <b>Review</b>: Add new <b>manual writing mode</b>.
                <ul>
                    <li>Show a manual-writing result preview overlay at the end of review.</li>
                </ul>
            </li>
            <li>
                <b>Chinese import</b>: Improve custom reading import by splitting pinyin syllables before tone tagging/audio generation.
            </li>
        </ul>
        
        <h4>v0.27.0 (2026-04-17)</h4>
        <ul>
            <li>
                <b>Deck-specific settings</b>: Add per-deck overrides with linked/unlinked controls.
                <ul>
                    <li>Open settings from deck contexts (Overview/Review/Deck) and jump to that deck’s settings.</li>
                    <li>Deck settings use local override when unlinked, and fallback to global when linked.</li>
                    <li>Add per-setting controls to <b>unlink from global</b> or <b>reset to global</b>.</li>
                </ul>
            </li>
            <li>
                <b>Data Export Reminder</b>: Add reminder flow for browser users without login.
                <ul>
                    <li>Configurable reminder period: daily, 2day, 3day, 4day, weekly, monthly.</li>
                    <li>Reminder tracks <b>last exported</b> time after profile export.</li>
                </ul>
            </li>
            <li>
                <b>Debug</b>: Add <b>simulate date</b> page (localhost only) for testing schedule/time flows.
            </li>
            <li>
                <b>FAQ</b>: Add deck-specific settings guidance.
            </li>
            <li>
                <b>UI</b>: Update backup reminder size and improve settings top reveal behavior.
            </li>
        </ul>
        
        <h4>v0.26.1 (2026-04-11)</h4>
        <ul>
            <li>
                <b>Bugfix</b>:
                <ul>
                    <li>
                        Fix day-index calculation to avoid timezone/DST shift issues in scheduling.
                    </li>
                    <li>
                        Automatically clean invalid meta-deck source deck IDs during app initialization to prevent broken meta deck references.
                    </li>
                </ul>
            </li>
            <li>
                <b>FAQ</b>: Add meta-deck FAQ entries covering what meta decks are, card selection behavior, source-deck updates, and current limitations.
            </li>
        </ul>

        <h4>v0.26.0 (2026-04-11)</h4>
        <ul>
            <li>
                <b>FAQ</b>: Add new searchable FAQ page, with quick access from About and Settings.
            </li>
            <li>
                <b>Review</b>: Fail/Reveal now fails only the current character by default, with a new <b>Fail Whole Word</b> setting to restore full-word behavior.
            </li>
            <li>
                <b>Scheduling</b>: Fix short-term learning/relearning scheduling so overdue and future cards are ordered more reliably during study.
            </li>
        </ul>

        <h4>v0.25.4 (2026-04-11)</h4>
        <ul>
            <li>
                <b>Bugfix</b>: Fix issue with missing deck schedule that lead to deck not being able to be displayed.
            </li>
        </ul>
        
        <h4>v0.25.3 (2026-04-03)</h4>
        <ul>
            <li>
                <b>Android</b>: Fix external dictionary buttons (Pleco & Dong) for Android.
            </li>
            <li>
                <b>UI</b>: Fix character block display for long sentences.
            </li>
        </ul>
        
        <h4>v0.25.2 (2026-03-29)</h4>
        <ul>
            <li>
                <b>UI</b>:
                Temporarely revert long sentences UI update as it introduce weird vertical layout in some devices.
            </li>
        </ul>
        
        <h4>v0.25.1 (2026-03-28)</h4>
        <ul>
            <li>
                <b>UI</b>:
                Fix character block display for long sentences.
            </li>
        </ul>
        
        <h4>v0.25.0 (2026-03-24)</h4>
        <ul>
            <li>
                <b>Review / Deck</b>:
                Improved handling for characters unsupported by Hanzi Writer to prevent review issues.
            </li>
            <li>
                <b>Import</b>:
                Fixed CSV parsing for quoted fields containing newlines.
            </li>
            <li>
                <b>UI</b>:
                Fixed bottom safe-area issues in the review screen and slideable popup on mobile devices.
            </li>
            <li>
                <b>Custom Deck</b>:
                Fixed an issue where non-dictionary words were not being reported correctly.
            </li>
        </ul>
        
        <h4>v0.24.2 (2026-03-21)</h4>
        <ul>
            <li>
                <b>UI</b>:
                Don't show audio loading if not playing audio. This will reduce visual distraction.
            </li>
        </ul>
        
        <h4>v0.24.1 (2026-03-20)</h4>
        <ul>
            <li>
                <b>Custom Deck</b>:
                Add more chars in the ignored char list.
            </li>
        </ul>
        
        <h4>v0.24.0 (2026-03-19)</h4>
        <ul>
            <li>
                <b>Review</b>:
                <ul>
                    <li>Reading can now be <b>revealed manually</b> instead of being auto-shown in some cases. You can use this for hint.</li>
                </ul>
            </li>
            <li>
                <b>Decks</b>:
                <ul>
                    <li>Added an option to <b>show last studied time</b> for each deck.</li>
                </ul>
            </li>
            <li>
                <b>Custom Deck</b>:
                <ul>
                    <li>Added support for importing <b>CSV files</b> (e.g., Excel, Google Sheets).</li>
                    <li>Added <b>advanced import options</b>:
                        <ul>
                            <li>Column selection for word, reading, and meaning.</li>
                            <li>Option to ignore CSV header row.</li>
                            <li>Option to ignore punctuation in words.</li>
                        </ul>
                    </li>
                    <li>Improved support for <b>Anki / tab-separated imports</b> with the same advanced options.</li>
                    <li>Custom decks can now include <b>reading and meaning directly</b> from imported data.</li>
                </ul>
            </li>
            <li>
                <b>UI (Mobile)</b>:
                <ul>
                    <li>Improved layout to respect <b>safe area insets</b> (notches, system bars).</li>
                </ul>
            </li>
        </ul>
        
        <h4>v0.23.2 (2026-02-22)</h4>
        <ul>
            <li>
                <b>Bugfix</b>:
                Fixed Blank Screen when <code>Show Reading On Fail/Reveal</code> is enabled
            </li>
        </ul>
        
        <h4>v0.23.1 (2026-02-21)</h4>
        <ul>
            <li>
                <b>Settings</b>:
                Show public UID in the settings page.
            </li>
        </ul>
        
        <h4>v0.23.0 (2026-02-16)</h4>
        <ul>
            <li>
                <b>Review</b>:
                Added the ability to setup a keyboard key to advance to the next card.
            </li>
        </ul>

        <h4>v0.22.1 (2026-01-27)</h4>
        <ul>
            <li><b>Review</b>: Fixed an issue where the <b>"auto next"</b> feature would not work correctly when <b>"play audio"</b> was disabled.
            </li>
        </ul>

        <h4>v0.22.0 (2026-01-25)</h4>
        <ul>
            <li><b>Review</b>:
                <ul>
                    <li>Added a setting to <b>automatically advance to the next card</b> upon a successful review.</li>
                    <li>Added a setting to display the reading of a card when it is failed/revealed.</li>
                    <li>Fixed an issue with FSRS short-term scheduling.</li>
                </ul>
            </li>
            <li><b>Decks</b>:
                <ul>
                    <li>Initial implementation of <b>meta decks</b>, which allow combining multiple decks into one.</li>
                    <div class="note">
                        This feature is still in experimental stage.
                    </div>
                </ul>
            </li>
        </ul>
        
        <h4>v0.21.1 (2025-12-01)</h4>
        <ul>
            <li>Tweak the loading indicator to no flash quickly.
            </li>
        </ul>
        
        
        <h4>v0.21.0 (2025-11-30)</h4>
        <ul>
            <li><b>Deck Editing</b>:
                <ul>
                    <li>Added bulk editing in the deck editor.</li>
                    <li>Added quick edit functionality.</li>
                    <div class="note">
                        - Select some words<br>
                        - Menu > Edit
                    </div>
                    <li>Converted selection action buttons into a popover menu.</li>
                </ul>
            </li>
            <li><b>Audio</b>:
                <ul>
                    <li>Added a setting to blacklist audio sources.</li>
                    <div class="note">
                        Goto:
                        Settings > Chinese > More Audio Settings
                    </div>
                </ul>
            </li>
            <li><b>Review</b>:
                <ul>
                    <li>Added a visual indicator when the audio or stroke data is being loaded.</li>
                </ul>
            </li>
            <li><b>General</b>:
                <ul>
                    <li>Fix logout functionality for the android app.</li>
                    <li>Implemented floating panel in settings and deck editor so user doesn't have to scroll to see the top buttons.</li>
                </ul>
            </li>
            <li><b>Deck</b>:
                <ul>
                    <li>Removed word duplicates in HSK v3.0 decks.</li>
                </ul>
            </li>
        </ul>
        
        <h4>v0.20.1 (2025-11-03)</h4>
        <ul>
            <li><b>Android</b>: Fix missing icon/app launcher.</li>
        </ul>
        
        <h4>v0.20.0 (2025-11-03)</h4>
        <ul>
            <li><b>Android</b>:
                <ul>
                    <li>Fix google login</li>
                    <li>Register <code>wenbun://</code> scheme</li>
                </ul>
                <div class="note">
                    Actually working google login for the android app.
                </div>
            </li>
            <li><b>Deck</b>:
                <ul>
                    <li>Fix major issue where deck data can be accidentally wiped out.</li>
                </ul>
            </li>
            <li><b>Writing</b>:
                <ul>
                    <li>Add <b>External</b> writing mode</li>
                </ul>
                <div class="note">
                    Allows users to practice writing characters on paper or outside the app, instead of drawing strokes on-screen. 
                    This mode disables automatic stroke grading and tracking.
                </div>
            </li>
            <li><b>Dictionary</b>:
                <ul>
                    <li>Update dictionary for "打"</li>
                </ul>
            </li>
        </ul>
        
        <h4>v0.19.1 (2025-10-29)</h4>
        <ul>
            <li><b>Audio</b>: Added a setting to use AI generated audio for words that have no audio recording in the database.</li>
        </ul>

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

    .note > code {
        background-color: white;
    }

    .privacy-policy-link {
        margin-top: 2em;
        font-size: 0.9em;
    }
    
    .privacy-policy-link a {
        color: var(--wenbun-blue);
    }
    
    code {
        background-color: #f0f0f0;
        padding: 0.2em 0.4em;
        border-radius: 0.3em;
    }
</style>