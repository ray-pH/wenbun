<script lang="ts">
    import { base } from "$app/paths";
    import DeckPreview from "$lib/components/DeckPreview.svelte";
    import TopBar from "$lib/components/TopBar.svelte";
    import { CUSTOM_DECK_INPUT_TYPE, CustomDeckParser, DEFAULT_CUSTOM_DECK, type CustomDeck } from "$lib/customDeck";
    import { onMount } from "svelte";
    import SettingsItem from "../settings/SettingsItem.svelte";
    import { App, type DeckData } from "$lib/app";
    import { goto } from "$app/navigation";

    const LOCAL_STORAGE_KEY = "customDeckInput";

    let app = new App();
    let parser = new CustomDeckParser(app);
    let input = "";
    let customDeck: CustomDeck = DEFAULT_CUSTOM_DECK;
    let issueCount = 0;
    let issueIds: number[] = [];
    let isShowIssuesOnly = false;
    
    let inputType = CUSTOM_DECK_INPUT_TYPE.Simple;
    let ankiInputWordColumn: number = 1;
    
    let _updateCounter = 0;
    function update() { _updateCounter++ }
    
    function onInputChanged() {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, input);
        const newParsed = getParsed();
        if (newParsed) {
            customDeck = {...customDeck, ...newParsed};
        }
        update();
    }
    
    function getParsed(): Partial<CustomDeck> {
        switch (inputType) {
            case CUSTOM_DECK_INPUT_TYPE.Simple: return parser.parseSimple(input);
            case CUSTOM_DECK_INPUT_TYPE.AnkiText: return parser.parseAnkiText(input, ankiInputWordColumn);
        }
    }
    
    async function uploadFile() {
        const payload = await app.fileManager.upload();
        if (payload === null || typeof payload.data !== "string") {
            window.alert("Failed to upload file.");
            return;
        } 
        input = payload.data;
        onInputChanged();
    }
    
    async function addDeck() {
        if (customDeck.name.trim() === "") {
            window.alert("Deck name cannot be empty.");
            return;
        }
        if (app.isDeckIdExists(customDeck.name)) {
            window.alert("Deck with this name already exists. Please choose another name.");
            return;
        }
        if (issueCount > 0) {
            const confirm = window.confirm("You have issues in your deck. Card with issues will be ignored. Are you sure you want to add this deck?");
            if (!confirm) return;
        }
        const deckData = parser.getDeckData(customDeck);
        deckData.ignoredIds = issueIds;
        await app.addDeck(customDeck.name, deckData);
        goto(`${base}/`);
    }
    
    onMount(async () => {
        const cachedInput = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cachedInput) {
            input = cachedInput;
        }
        await app.init();
        onInputChanged();
        app = app;
        const changed = await app.initProfile();
        if (changed) {
            onInputChanged();
        }
        app = app;
    })
    
</script>

<TopBar title="Upload Custom Deck"></TopBar>
<div class="main-container">
    <div class="upload-container">
        <div class="section-title">Input</div>
        <div>
            <label>Format:
                <select bind:value={inputType} onchange={onInputChanged}>
                    <option value={CUSTOM_DECK_INPUT_TYPE.Simple}>Simple</option>
                    <option value={CUSTOM_DECK_INPUT_TYPE.AnkiText}>Anki Text</option>
                </select>
            </label>
            <a href="{base}/upload-custom-deck/help" aria-label="Help" class="help-link">
                <i class="fa-solid fa-circle-question"></i>
            </a>
        </div>
        {#if inputType === CUSTOM_DECK_INPUT_TYPE.AnkiText}
            <div>
                <label> Column Index:
                    <input type="number" bind:value={ankiInputWordColumn} step="1" min="0" oninput={onInputChanged}>
                </label>
            </div>
        {/if}
        <textarea 
            bind:value={input} 
            oninput={onInputChanged}
            class="deck-textarea" placeholder="Enter deck text here"
        ></textarea>
        <button class="button" style="align-self: flex-end;" onclick={uploadFile}>
            <i class="fa-solid fa-upload"></i>&nbsp;
            Upload File
        </button>
    </div>
    <div class="preview-container">
        <div class="section-title">Preview</div>
        <div class="info-issue-container">
            {#if issueCount != 0}
                <div class="info-issue is-issue">
                    Found {issueCount} issue(s)
                </div>
                <button class="button" onclick={() => isShowIssuesOnly = !isShowIssuesOnly}>
                    {isShowIssuesOnly ? "Show All" : "Filter to Issues"}
                </button>
            {:else}
                <div class="info-issue">
                    No issues found.
                </div>
                <button class="button" style="visibility: hidden;">
                    &npsb;
                    <!-- this is here just to keep the layout consistent -->
                </button>
            {/if}
        </div>
        {#key _updateCounter}
            <div class="deck-preview-container">
                <DeckPreview deck={customDeck} filterShowIssueOnly={isShowIssuesOnly} 
                    bind:issueCount={issueCount} bind:issueIds={issueIds}></DeckPreview>
            </div>
        {/key}
    </div>
    <div class="config-container">
        <div class="section-title">Config</div>
        <div class="config-items">
            <SettingsItem key="deckName">
                <div style="text-align: right;">
                    <input type="text" bind:value={customDeck.name} class:invalid={app.isDeckIdExists(customDeck.name)}>
                    <div class="warning-text" style="color: #A64547;" class:hidden={!app.isDeckIdExists(customDeck.name)}>
                        Deck with this name already exists. Please choose another name.
                    </div>
                    <div class="warning-text" style="color: #A64547;" class:hidden={customDeck.name.trim()}>
                        Deck name cannot be empty.
                    </div>
                </div>
            </SettingsItem>
            <SettingsItem key="deckLanguage">
                <select bind:value={customDeck.lang}>
                    <option value="zh">Mandarin</option>
                    <option value="yue">Cantonese</option>
                </select>
            </SettingsItem>
            <SettingsItem key="deckEnableCustomDictionary">
                <input type="checkbox" bind:checked={customDeck.isEnableCustomDictionary} onchange={onInputChanged}>
            </SettingsItem>
        </div>
    </div>
    <div class="add-deck-container">
        <button class="button" onclick={addDeck}>
            Add Deck
        </button>
    </div>
</div>

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 90vw;
        max-width: 30em;
        margin: auto;
    }
    textarea {
        font-size: 1em;
        width: 100%;
        height: 4em;
    }
    .warning-text {
        &.hidden {
            display: none;
        }
        color: #00000090;
        font-size: 0.8em;
        max-width: 15em;
    }
    .info-issue-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5em;
    }
    .section-title {
        font-weight: bold;
        margin-bottom: 0.5em;
    }
    .upload-container {
        margin-top: 2em;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: center;
        gap: 0.5em;
    }
    .preview-container {
        margin-top: 1em;
        width: 100%;
    }
    .config-container {
        margin-top: 1em;
        width: 100%;
    }
    .deck-preview-container {
        border-radius: 0.5em;
        height: 15em;
        overflow-y: scroll;
    }
    .config-items {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }
    .info-issue.is-issue {
        color: #A64547;
    }
    .add-deck-container {
        width: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: end;
    }
    .help-link {
        color: var(--wenbun-blue);
    }
    
</style>