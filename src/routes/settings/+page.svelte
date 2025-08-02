<script lang="ts">
    import { base } from '$app/paths';
    import { onMount } from "svelte";
    import { App, NewCardOrder, type WenbunConfig } from "$lib/app";
    import TopBar from "$lib/components/TopBar.svelte";
    import _ from "lodash";
    import SettingsItem from "./SettingsItem.svelte";
    import * as FSRS from "ts-fsrs"
    import { type DeepRequired } from "$lib/util";
    import { ChineseToneColorPalette } from "$lib/constants";
    import { ChineseMandarinReading } from '$lib/chinese';
    
    let app = new App();
    let config: DeepRequired<WenbunConfig>;
    let initialConfig: DeepRequired<WenbunConfig>;
    onMount(async () => {
        await app.init();
        config = _.cloneDeep(app.getConfig());
        initialConfig = _.cloneDeep(config);
        learningStepsString = config.learningSteps.join(" ");
        previouslyStudiedLearningStepsString = config.previouslyStudiedLearningSteps.join(" ");
        fsrsParamsString = config.FSRSParams.join(",");
        profileStr = app.exportProfile();
        initialProfileStr = profileStr;
        app = app;
    })
    
    $: isConfigChanged = !_.isEqual(config, initialConfig);
    
    async function saveConfig() {
        await app.saveConfig(config);
        initialConfig = _.cloneDeep(config);
    }
    
    async function resetDebugProfile(): Promise<void> {
        const confirm = window.confirm("Are you sure you want to reset to the debug profile?");
        if (!confirm) return;
        await app.debug();
        app = app;
    }
    
    let selectedTonePreset = '';
    function loadChineseToneColorPreset(key: string) {
        const colors = (ChineseToneColorPalette as any)[key];
        if (colors) {
            config.zh.toneColors = colors;
        }
        selectedTonePreset = '';
    }
    
    let learningStepsString = "";
    let previouslyStudiedLearningStepsString = "";
    let fsrsParamsString = "";
    let isLearningStepsStringValid = true;
    let isPreviouslyStudiedLearningStepsStringValid = true;
    let isFSRSParamsStringValid = true;
    $: {
        if (config) {
            const learningStepsParts = learningStepsString.split(" ").map((s) => s.trim()).filter((s) => s);
            const isLearningStepStringValid = learningStepsParts.length < 4 && learningStepsParts.every((s) => s.match(/^\d+[m|d]$/));
            if (isLearningStepStringValid) {
                config.learningSteps = learningStepsParts as FSRS.Steps;
            }
            const previouslyStudiedLearningStepsParts = previouslyStudiedLearningStepsString.split(" ").map((s) => s.trim()).filter((s) => s);
            const isPreviouslyStudiedLearningStepsStringValid = previouslyStudiedLearningStepsParts.length < 4 && previouslyStudiedLearningStepsParts.every((s) => s.match(/^\d+[m|d]$/));
            if (isPreviouslyStudiedLearningStepsStringValid) {
                config.previouslyStudiedLearningSteps = previouslyStudiedLearningStepsParts as FSRS.Steps;
            }
            const fsrsParamsParts = fsrsParamsString.split(",").map((s) => s.trim()).filter((s) => s);
            const isFSRSParamsStringValid = fsrsParamsParts.length === 21 && fsrsParamsParts.every((s) => !isNaN(parseFloat(s)));
            if (isFSRSParamsStringValid) {
                config.FSRSParams = fsrsParamsParts.map((s) => parseFloat(s));
            }
        }
    }
    
    let isShowProfileTextbox = false;
    let profileStr = "";
    let initialProfileStr = "";
    $: isProfileStrChanged = profileStr !== initialProfileStr;
    function importProfileData() {
        app.tryImportProfile(profileStr).then((success) => {
            alertImportProfile(success);
        });
    }
    function tryUploadProfile() {
        app.tryUploadProfile().then((success) => {
            alertImportProfile(success);
        });
    }
    function alertImportProfile(success: boolean) {
        if (success) {
            window.alert("Successfully imported profile data");
        } else {
            window.alert("Failed to import profile data");
        }
    }
    
</script>

<!-- TODO: setup proper backUrl -->
<TopBar title="Settings" backUrl="{base}/" isSettings={true}></TopBar>
<div class="main-container">
    {#if config}
        <div class="settings-section">
            <!-- TODO: improve the UI for this -->
            <button class="button" onclick={() => saveConfig()} disabled={!isConfigChanged}>Save</button>
        </div>
        <div class="settings-section">
            <div class="section-title">Profile</div>
            <div class="section-container">
                {#if isShowProfileTextbox}
                    <textarea bind:value={profileStr} class="profile-textarea"></textarea>
                    <button class="button" onclick={() => importProfileData()} disabled={!isProfileStrChanged}>import</button>
                    <div class="settings-label-help" style="margin: 1em 0">
                        To manually export the profile data, copy the text above and store it somewhere safe.<br>
                        To manually import the profile data, paste the text into the textbox and click the import button.
                    </div>
                    <button class="button" onclick={() => resetDebugProfile()}>Reset Debug Profile</button>
                {/if}
                <button class="button" onclick={() => isShowProfileTextbox = !isShowProfileTextbox}>
                    manual import/export
                </button>
                <button class="button" onclick={() => app.downloadProfile()}>
                    <i class="fa-solid fa-download"></i>&nbsp;
                    export profile data (download)
                </button>
                <button class="button" onclick={() => tryUploadProfile()}>
                    <i class="fa-solid fa-upload"></i>&nbsp;
                    import profile data (upload)
                </button>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-title">Learning</div>
            <div class="section-container">
                <SettingsItem key="newCardPerDay">
                    <input type="number" bind:value={config.newCardPerDay}>
                </SettingsItem>
                <SettingsItem key="maxReviewsPerDay">
                    <input type="number" bind:value={config.maxReviewsPerDay}>
                </SettingsItem>
                <SettingsItem key="newCardOrder">
                    <select bind:value={config.newCardOrder}>
                        <option value={NewCardOrder.Mix}>Mix</option>
                        <option value={NewCardOrder.AfterReviews}>After Reviews</option>
                        <option value={NewCardOrder.BeforeReviews}>Before Reviews</option>
                    </select>
                </SettingsItem>
                <SettingsItem key="newPreviouslyStudiedCardPerDay">
                    <input type="number" bind:value={config.newPreviouslyStudiedCardPerDay}>
                </SettingsItem>
                <SettingsItem key="newPreviouslyStudiedCardOrder">
                    <select bind:value={config.newPreviouslyStudiedCardOrder}>
                        <option value={NewCardOrder.Mix}>Mix</option>
                        <option value={NewCardOrder.AfterReviews}>After Reviews</option>
                        <option value={NewCardOrder.BeforeReviews}>Before Reviews</option>
                    </select>
                </SettingsItem>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-title">FSRS</div>
            <div class="section-container">
                <SettingsItem key="learningSteps">
                    <input type="text" 
                        bind:value={learningStepsString} 
                        class:invalid={!isLearningStepsStringValid}
                    >
                </SettingsItem>
                <SettingsItem key="previouslyStudiedLearningSteps">
                    <input type="text" 
                        bind:value={previouslyStudiedLearningStepsString} 
                        class:invalid={!isPreviouslyStudiedLearningStepsStringValid}
                    >
                </SettingsItem>
                <SettingsItem key="desiredRetention">
                    <div style="display: flex; flex-direction: row; align-items: center; gap: 0.5em;">
                        <input type="number" bind:value={config.desiredRetention} step="0.01">
                    </div>
                </SettingsItem>
                <SettingsItem key="enableShortTerm">
                    <input type="checkbox" bind:checked={config.enableShortTerm}>
                </SettingsItem>
                <SettingsItem key="enableFuzz">
                    <input type="checkbox" bind:checked={config.enableFuzz}>
                </SettingsItem>
                <SettingsItem key="FSRSParams">
                    <textarea bind:value={fsrsParamsString} class:invalid={!isFSRSParamsStringValid}></textarea>
                </SettingsItem>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-title">Chinese</div>
            <div class="section-container">
                <SettingsItem key="zhAlwaysShowReading">
                    <input type="checkbox" bind:checked={config.zh.alwaysShowReading}>
                </SettingsItem>
                <SettingsItem key="zhMandarinReading">
                    <select bind:value={config.zh.mandarinReading}>
                        <option value={ChineseMandarinReading.Pinyin}>Pinyin (wén)</option>
                        <option value={ChineseMandarinReading.PinyinNumeric}>Numeric (wen2)</option>
                        <option value={ChineseMandarinReading.Zhuyin}>Zhuyin (ㄨㄣˊ)</option>
                    </select>
                </SettingsItem>
                <SettingsItem key="zhIsColorBasedOnTone">
                    <input type="checkbox" bind:checked={config.zh.isColorBasedOnTone}>
                </SettingsItem>
                <SettingsItem key="zhToneColors">
                    <div>
                        <div>Load Preset</div>
                        <div>
                            <select bind:value={selectedTonePreset} onchange={() => loadChineseToneColorPreset(selectedTonePreset)}>
                                {#each Object.keys(ChineseToneColorPalette) as key}
                                    <option value={key}>{key}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                </SettingsItem>
                <SettingsItem key="zhTone1">
                    <input type="color" bind:value={config.zh.toneColors[0]}>
                </SettingsItem>
                <SettingsItem key="zhTone2">
                    <input type="color" bind:value={config.zh.toneColors[1]}>
                </SettingsItem>
                <SettingsItem key="zhTone3">
                    <input type="color" bind:value={config.zh.toneColors[2]}>
                </SettingsItem>
                <SettingsItem key="zhTone4">
                    <input type="color" bind:value={config.zh.toneColors[3]}>
                </SettingsItem>
                <SettingsItem key="zhToneNeutral">
                    <input type="color" bind:value={config.zh.toneColors[4]}>
                </SettingsItem>
            </div>
        </div>
        
        <div class="settings-section">
            <!-- <div class="section-title"></div> -->
            <div class="section-container">
                <a class="button" href="https://github.com/ray-pH/wenbun" aria-label="GitHub Repository" target="_blank">
                    <i class="fa-brands fa-github"></i>&nbsp;
                    GitHub Repository
                </a>
                <a class="button" href="https://discord.gg/Ab25UgysDt" aria-label="GitHub Repository" target="_blank">
                    <i class="fa-brands fa-discord"></i>&nbsp;
                    Discord Community Server
                </a>
            </div>
        </div>
    {/if}
</div>

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        margin: 1em 0;
        padding-top: 1em;
    }
    .settings-section {
        width: 100%;
        padding: 0 1em;
        max-width: 25em;
        box-sizing: border-box;
    }
    .settings-section::after {
        width: 90%;
        height: 1px;
        background-color: #00000090;
        content: '';
        display: block;
        align-self: center;
        margin-top: 1.5em;
        margin-bottom: 1.5em;
        border-radius: 0.5em;
    }
    .section-title {
        font-weight: bold;
        font-size: 1.4em;
        margin-bottom: 0.5em;
    }
    .section-container {
        display: flex;
        flex-direction: column;
        gap: 1em;
        input {
            width: 5em;
        }
    }
    .settings-label-help {
        color: #00000090;
        font-size: 0.8em;
    }
    .profile-textarea {
        width: 100%;
        height: 10em;
        white-space: pre-wrap;
        word-break: break-all;
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