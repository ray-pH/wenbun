<script lang="ts">
    import { base } from "$app/paths";
    import TopBar from "$lib/components/TopBar.svelte";
    import { CustomDeckParser, DEFAULT_CUSTOM_DECK, type CustomDeck } from "$lib/customDeck";
    import { onMount } from "svelte";
    import SettingsItem from "../../settings/SettingsItem.svelte";
    import { App, type DeckData } from "$lib/app";
    import { goto } from "$app/navigation";

    let app = new App();
    let parser = new CustomDeckParser(app);
    let customDeck: CustomDeck = DEFAULT_CUSTOM_DECK;
    let allCustomDeckIdAndNamePairs: {id: string, label?: string}[] = [];
    
    let _updateCounter = 0;
    function update() { _updateCounter++ }
    function onInputChanged() {
        updateParamBasedOnFirstDeck();
        update();
    }
    
    let selectedSubdeckId = "";
    let subdeckIds: string[] = [];
    function addSubdeck(id: string) {
        if (!subdeckIds.includes(id)) {
            subdeckIds.push(id);
            subdeckIds = subdeckIds;
        }
        selectedSubdeckId = "";
        onInputChanged();
    }
    function removeSubdeck(id: string) {
        const index = subdeckIds.indexOf(id);
        if (index !== -1) {
            subdeckIds.splice(index, 1);
            subdeckIds = subdeckIds;
        }
        onInputChanged();
    }
    
    
    async function addDeck() {
        if (customDeck.name.trim() === "") {
            window.alert("Deck name cannot be empty.");
            return;
        }
        const deckData = parser.getDeckData(customDeck);
        deckData.isMetaDeck = true;
        deckData.subDeckIds = subdeckIds;
        app.addDeck(customDeck.name, deckData);
        await app.save(false, true);
        goto(`${base}/`);
    }
    
    function updateParamBasedOnFirstDeck() {
        if (subdeckIds.length === 0) return;
        const id = subdeckIds[0];
        customDeck.lang = app.getDeckLanguage(id);
        customDeck.isEnableCustomDictionary = app.isDeckUsingExtraDict(id);
    }
    
    let deckIdNameMap = new Map<string, string>();
    onMount(async () => {
        await app.init(null);
        initComponent();
        const changed = await app.initProfile(null);
        if (changed) initComponent();
        subdeckIds = ['hsk1-v3.0', '6rcyqmfc']
    })
    function initComponent() {
        onInputChanged();
        app = app;
        allCustomDeckIdAndNamePairs = app.getAllDeckIdAndNamePairs();
        allCustomDeckIdAndNamePairs.forEach(pair => deckIdNameMap.set(pair.id, pair.label ?? pair.id));
    }
    
</script>

<TopBar title="Add Meta Deck"></TopBar>
<div class="main-container">
    <div class="upload-container">
        <div class="section-title">Subdecks</div>
        <div class="subdeck-container">
            {#each subdeckIds as id}
                <div class="subdeck-item">
                    {deckIdNameMap.get(id)}
                    <button class="button" onclick={() => removeSubdeck(id)}>x</button>
                </div>
            {/each}
        </div>
        <div>
            <select bind:value={selectedSubdeckId} onchange={(event) => addSubdeck((event.target as any).value)}>
                <option value="" disabled selected hidden>Add Subdeck</option>
                {#each allCustomDeckIdAndNamePairs as {id, label}}
                    <option value={id}>{label}</option>
                {/each}
            </select>
        </div>
    </div>
    <div class="config-container">
        <div class="section-title">Config</div>
        <div class="config-items">
            <SettingsItem key="deckName">
                <div style="text-align: right;">
                    <input type="text" bind:value={customDeck.name}>
                    <div class="warning-text" style="color: #A64547;" class:hidden={customDeck.name.trim()}>
                        Deck name cannot be empty.
                    </div>
                </div>
            </SettingsItem>
            <SettingsItem key="deckLanguage">
                <select bind:value={customDeck.lang} disabled>
                    <option value="zh">Mandarin</option>
                    <option value="yue">Cantonese</option>
                </select>
            </SettingsItem>
            <SettingsItem key="deckEnableCustomDictionary">
                <input type="checkbox" bind:checked={customDeck.isEnableCustomDictionary} onchange={onInputChanged} disabled>
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
    .warning-text {
        &.hidden {
            display: none;
        }
        color: #00000090;
        font-size: 0.8em;
        max-width: 15em;
    }
    .section-title {
        font-weight: bold;
        margin-bottom: 0.5em;
    }
    select {
        padding: 0.5em;
        border-radius: 0.5em;
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
    .config-container {
        margin-top: 1em;
        width: 100%;
    }
    .config-items {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }
    .add-deck-container {
        width: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: end;
    }
    
    .subdeck-container {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }
    .subdeck-item {
        background-color: white;
        padding: 0.5em 1em;
        border-radius: 0.5em;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1em;
    }
    
</style>