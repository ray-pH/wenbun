<script lang="ts">
    import { base } from '$app/paths';
    import { onMount } from "svelte";
    import { App, NewCardOrder, WritingMode, type DataExportReminderPeriod, type WenbunConfig } from "$lib/app";
    import TopBar from "$lib/components/TopBar.svelte";
    import _ from "lodash";
    import SettingsItem from "./SettingsItem.svelte";
    import * as FSRS from "ts-fsrs"
    import { getKeysRecursive, type DeepPartial, type DeepRequired } from "$lib/util";
    import { ChineseToneColorPalette } from "$lib/constants";
    import { ChineseMandarinReading } from '$lib/chinese';
    import ProfileLogin from './ProfileLogin.svelte';
    import { SyncMode, type ManualSyncStatus } from '$lib/profile';
    import '@khmyznikov/pwa-install';
    import type { PWAInstallElement } from '@khmyznikov/pwa-install';
    import { isTauri } from '@tauri-apps/api/core';
    import TopRevealBar from '$lib/components/TopRevealBar.svelte';
    import { goto } from '$app/navigation';
    
    export let data: {leniency?: string, fadeDuration?: string, fromDeckId?: string, deckId?: string};
    
    let app = new App();
    let config: DeepRequired<WenbunConfig>;
    let initialConfig: DeepRequired<WenbunConfig>;
    let unlinkedKeys: string[] = [];
    let initialUnlinkedKeys: string[] = [];
    let isOnlineProfileLoaded = false;
    let isLoggedIn = false;
    let dataExportReminderEnabled = true;
    let initialDataExportReminderEnabled = true;
    let dataExportReminderPeriod: DataExportReminderPeriod = 'daily';
    let initialDataExportReminderPeriod: DataExportReminderPeriod = 'daily';
    let pwaInstallComponent: PWAInstallElement;
    
    $: fromDeckDeckInfo = app.getDeckInfo(data.fromDeckId ?? '');
    $: deckDeckInfo = app.getDeckInfo(data.deckId ?? '');
    $: topBarTitle = data.deckId && isAppInitialized && deckDeckInfo?.title
        ? `Settings - ${deckDeckInfo.title}${deckDeckInfo.subtitle ? ` ${deckDeckInfo.subtitle}` : ''}`
        : 'Settings';

    $: deckSettingsItemProps = ({
        isDeckSettings: !!data.deckId,
        isNotLinked: isNotLinkedToGlobalSettings,
        onReset: resetSettingToGlobal,
        onUnlink: unlinkSettingFromGlobal,
    });
    
    let isAppInitialized = false;
    let lastRouteKey = '';
    $: routeKey = `${data.deckId}|${data.fromDeckId}`;
    $: if (isAppInitialized && routeKey !== lastRouteKey) {
        lastRouteKey = routeKey;
        initComponent();
    }
    

    function scrollToReminderHashTarget() {
        if (typeof window === "undefined") return;
        if (window.location.hash !== "#data-export-reminder") return;
        const el = document.getElementById("data-export-reminder");
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    onMount(async () => {
        await app.init(null);
        isAppInitialized = true;
        initComponent();
        const changed = await app.initProfile(null);
        isLoggedIn = app.profile.isLoggedIn;
        if (await app.profile.getSyncMode() === SyncMode.manual) {
            await app.profile.getManualSyncStatus(app);
        }
        isOnlineProfileLoaded = true;
        if (changed) initComponent();
        scrollToReminderHashTarget();
    })
    
    function initComponent() {
        config = _.cloneDeep(app.getConfig(data.deckId ?? null));
        initialConfig = _.cloneDeep(config);
        learningStepsString = config.learningSteps.join(" ");
        previouslyStudiedLearningStepsString = config.previouslyStudiedLearningSteps.join(" ");
        fsrsParamsString = config.FSRSParams.join(",");
        profileStr = app.exportProfileStr();
        initialProfileStr = profileStr;

        const reminderMeta = app.getDataExportReminderMeta();
        dataExportReminderEnabled = reminderMeta.isEnabled;
        initialDataExportReminderEnabled = reminderMeta.isEnabled;
        dataExportReminderPeriod = reminderMeta.period;
        initialDataExportReminderPeriod = reminderMeta.period;

        if (data.leniency) config.strokeLeniency = parseFloat(data.leniency);
        if (data.fadeDuration) config.strokeFadeDuration = parseInt(data.fadeDuration);
        app = app;
        
        if (data.deckId) {
            unlinkedKeys = [...getKeysRecursive(app.getDeckPartialConfig(data.deckId))];
            initialUnlinkedKeys = _.cloneDeep(unlinkedKeys);
        } else {
            unlinkedKeys = [];
            initialUnlinkedKeys = [];
        }
    }
    
    function isNotLinkedToGlobalSettings(path: string): boolean {
        return unlinkedKeys.includes(path);
    }

    function resetSettingToGlobal(path: string) {
        unlinkedKeys = unlinkedKeys.filter((k) => k !== path);
        const globalValue = _.get(app.getConfig(null), path);
        _.set(config, path, _.cloneDeep(globalValue));
        config = config;
    }

    function unlinkSettingFromGlobal(path: string) {
        if (!unlinkedKeys.includes(path)) {
            unlinkedKeys = [...unlinkedKeys, path];
        }
    }

    $: isConfigChanged = !_.isEqual(config, initialConfig) || !_.isEqual(_.sortBy(unlinkedKeys), _.sortBy(initialUnlinkedKeys)) || dataExportReminderEnabled !== initialDataExportReminderEnabled || dataExportReminderPeriod !== initialDataExportReminderPeriod; async function saveConfig() { app.setDataExportReminderMeta(dataExportReminderEnabled, dataExportReminderPeriod); if (data.deckId) { await app.saveDeckConfig(data.deckId, config, unlinkedKeys); } else {
            await app.saveConfig(config); } initialConfig = _.cloneDeep(config); initialUnlinkedKeys = _.cloneDeep(unlinkedKeys);
        initialDataExportReminderEnabled = dataExportReminderEnabled; initialDataExportReminderPeriod = dataExportReminderPeriod; } function discardChanges() { config = _.cloneDeep(initialConfig); unlinkedKeys = _.cloneDeep(initialUnlinkedKeys); dataExportReminderEnabled = initialDataExportReminderEnabled; dataExportReminderPeriod = initialDataExportReminderPeriod; }
    async function resetConfigToDefault() { const confirm = window.confirm("Are you sure you want to reset to the default settings?"); if (!confirm) return; await app.resetConfigToDefault(); config = _.cloneDeep(app.getConfig(data.deckId ?? null)); initialConfig = _.cloneDeep(config); } async function resetDebugProfile(): Promise<void> { const confirm = window.confirm("Are you sure you want to reset to the debug profile?"); if (!confirm) return;
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
        app.tryImportProfileStr(profileStr).then((success) => {
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
    
    function backConfirmCallback(): Promise<boolean> {
        return new Promise((resolve) => {
            if (!isConfigChanged) {
                resolve(true);
            } else {
                const confirm = window.confirm("You have unsaved changes. Are you sure you want to leave without saving?");
                resolve(confirm);
            }
        });
    }
    
    function showPWAInstallDialog() {
        if (pwaInstallComponent && typeof pwaInstallComponent.showDialog === 'function') {
           pwaInstallComponent.showDialog(true);
         }
    }
    
    function addKeyButton() {
        config.nextButtonKeyCodes = [ ...config.nextButtonKeyCodes, undefined ];
    }
    let editingKeyButtonIndex: number|undefined = undefined;
    function requestEditKeyButton(index: number) {
        editingKeyButtonIndex = index;
        const handler = (e: KeyboardEvent) => {
            e.preventDefault();
            window.removeEventListener("keydown", handler);
            if (e.code === 'Escape') {
                // cancel
            } else {
                // save
                config.nextButtonKeyCodes[index] = e.code;
            }
            editingKeyButtonIndex = undefined;
        };
        window.addEventListener("keydown", handler);
    }
    function removeNextKeyButton(index: number) {
        config.nextButtonKeyCodes = config.nextButtonKeyCodes.filter((_, i) => i !== index);
    }
    
    function gotoDeckSettings() {
        if (data.fromDeckId) {
            goto(`${base}/settings?deckId=${data.fromDeckId}`);
        }
    }
    
</script>

<TopBar title={topBarTitle} isSettings={true} backConfirmCallback={backConfirmCallback} 
    prohibitedBackUrls={[`${base}/settings/leniency-calibration`, `${base}/auth-token`]}>
</TopBar>

{#snippet topSettingsContent()}
    <div class="top-settings-section floating">
        <button class="button" onclick={() => saveConfig()} disabled={!isConfigChanged}>Save</button>
        <button class="button" onclick={() => discardChanges()} disabled={!isConfigChanged}>Discard Changes</button>
    </div>
{/snippet}

{#snippet nextButtonKeyConfig()}
    <button class="hidden-button">hidden button to trick html label behaviour</button>
    <div class="next-key-button-container">
        {#each config.nextButtonKeyCodes as code, index}
            <div class="next-key-button-key">
                <button class="next-key-button-key-button" class:is-editing={editingKeyButtonIndex === index} onclick={() => requestEditKeyButton(index)}>
                    <span>{code ?? '-'}</span>
                </button>
                <button onclick={() => removeNextKeyButton(index)} aria-label="Remove Key">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
        {/each}
    </div>
    <button class="button" onclick={() => addKeyButton()}>Add New Key</button>
{/snippet}

<TopRevealBar isShow={isConfigChanged}>
    {@render topSettingsContent()}
</TopRevealBar>
<div class="main-container">
    {#if config}
        <div class="top-settings-section">
            {@render topSettingsContent()}
        </div>
        {#if data.fromDeckId}
            <div class="settings-section no-line" style="margin-bottom: 1em">
                <div class="section-container">
                    <button class="button" onclick={gotoDeckSettings} style="display: block">
                        <i class="fa-solid fa-arrow-right"></i>&nbsp;
                        Go to Deck Specific Settings 
                        <span style="font-weight: bold;">({fromDeckDeckInfo?.title}{fromDeckDeckInfo?.subtitle ? ` ${fromDeckDeckInfo.subtitle}` : ''})</span>
                    </button>
                </div>
            </div>
        {/if}
        {#if !data.deckId}
        <div class="settings-section">
            <div class="section-title">Profile</div>
            <div class="section-container">
                {#if app}
                    {#key isOnlineProfileLoaded}
                        <ProfileLogin app={app} isOnlineProfileLoaded={isOnlineProfileLoaded}/>
                    {/key}
                {/if}
                {#if isShowProfileTextbox}
                    <textarea bind:value={profileStr} class="profile-textarea"></textarea>
                    <button class="button" onclick={() => importProfileData()} disabled={!isProfileStrChanged}>import</button>
                    <div class="settings-label-help" style="margin: 1em 0">
                        To manually export the profile data, copy the text above and store it somewhere safe.<br>
                        To manually import the profile data, paste the text into the textbox and click the import button.
                    </div>
                    <!-- <button class="button" onclick={() => resetDebugProfile()}>Reset Debug Profile</button> -->
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
        {/if}
        
        <div class="settings-section">
            <div class="section-title">Learning</div>
            <div class="section-container">
                {#if config.writingMode === WritingMode.External}
                    <SettingsItem key="gradingMethod" {...deckSettingsItemProps}>
                        <select disabled value="manual">
                            <option value="auto">auto</option>
                            <option value="manual">manual</option>
                        </select>
                    </SettingsItem>
                {:else}
                    <SettingsItem key="gradingMethod" {...deckSettingsItemProps}>
                        <select bind:value={config.gradingMethod}>
                            <option value="auto">auto</option>
                            <option value="manual">manual</option>
                        </select>
                    </SettingsItem>
                {/if}
                <SettingsItem key="writingMode" {...deckSettingsItemProps}>
                    <select bind:value={config.writingMode}>
                        <option value="{WritingMode.Default}">Default</option>
                        <option value="{WritingMode.External}">External</option>
                    </select>
                </SettingsItem>
                <SettingsItem key="newCardPerDay" {...deckSettingsItemProps}>
                    <input type="number" bind:value={config.newCardPerDay}>
                </SettingsItem>
                <SettingsItem key="maxReviewsPerDay" {...deckSettingsItemProps}>
                    <input type="number" bind:value={config.maxReviewsPerDay}>
                </SettingsItem>
                <SettingsItem key="newCardOrder" {...deckSettingsItemProps}>
                    <select bind:value={config.newCardOrder}>
                        <option value={NewCardOrder.Mix}>Mix</option>
                        <option value={NewCardOrder.AfterReviews}>After Reviews</option>
                        <option value={NewCardOrder.BeforeReviews}>Before Reviews</option>
                    </select>
                </SettingsItem>
                <SettingsItem key="newPreviouslyStudiedCardPerDay" {...deckSettingsItemProps}>
                    <input type="number" bind:value={config.newPreviouslyStudiedCardPerDay}>
                </SettingsItem>
                <SettingsItem key="newPreviouslyStudiedCardOrder" {...deckSettingsItemProps}>
                    <select bind:value={config.newPreviouslyStudiedCardOrder}>
                        <option value={NewCardOrder.Mix}>Mix</option>
                        <option value={NewCardOrder.AfterReviews}>After Reviews</option>
                        <option value={NewCardOrder.BeforeReviews}>Before Reviews</option>
                    </select>
                </SettingsItem>
                <SettingsItem key="isAutoNextOnSuccess" {...deckSettingsItemProps}>
                    <input type="checkbox" disabled={config.gradingMethod === 'manual'} bind:checked={config.isAutoNextOnSuccess}>
                </SettingsItem>
                <SettingsItem key="gradeWarmUpCards" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.gradeWarmUpCards}>
                </SettingsItem>
                <SettingsItem key="startPreviouslyStudiedCardFromTheBack" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.startPreviouslyStudiedCardFromTheBack}>
                </SettingsItem>
                <SettingsItem key="separateLearnAndReview" inputKey="isSeparateLearnAndReview" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.isSeparateLearnAndReview}>
                </SettingsItem>
                <SettingsItem key="failWholeWord" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.failWholeWord}>
                </SettingsItem>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-title">UI, Audio & Input</div>
            <div class="section-container">
                {#if !data.deckId}
                <SettingsItem key="uiScale" {...deckSettingsItemProps}>
                    <select bind:value={config.uiScale}>
                        <option value="small">small</option>
                        <option value="normal">normal</option>
                        <option value="custom">custom</option>
                    </select>
                </SettingsItem>
                {#if config.uiScale === 'custom'}
                    <SettingsItem key="customFontSize" {...deckSettingsItemProps}>
                        <input type="number" step="1" min="8" max="32" bind:value={config.customFontSize}>
                    </SettingsItem>
                {/if}
                {/if}
                {#if config.gradingMethod === 'auto'}
                    <SettingsItem key="showHealthBar" inputKey="showAutoGradingBar" {...deckSettingsItemProps}>
                        <input type="checkbox" bind:checked={config.showAutoGradingBar}>
                    </SettingsItem>
                {/if}
                <SettingsItem key="playSuccessSound" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.playSuccessSound}>
                </SettingsItem>
                <!-- <SettingsItem key="showReadingOnFail">
                    <input type="checkbox" bind:checked={config.showReadingOnFail}>
                </SettingsItem> -->
                {#if !data.deckId}
                <SettingsItem key="showDeckLastStudyTime" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.showDeckLastStudyTime}>
                </SettingsItem>
                {/if}
                <SettingsItem key="enableNextKeyButtons" inputKey="enableNextButtonKey" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.enableNextButtonKey}>
                </SettingsItem>
                {#if config.enableNextButtonKey}
                    <SettingsItem key="nextKeyButtons" inputKey="nextButtonKeyCodes" {...deckSettingsItemProps}>
                        {@render nextButtonKeyConfig()}
                    </SettingsItem>
                {/if}
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-title">Character Writer</div>
            <div class="section-container">
                <SettingsItem key="showHintAfterMissesCount" {...deckSettingsItemProps}>
                    <input type="number" step="1" min="0" bind:value={config.showHintAfterMissesCount}>
                </SettingsItem>
                <SettingsItem key="strokeLeniency" {...deckSettingsItemProps}>
                    <input type="number" step="0.01" bind:value={config.strokeLeniency}>
                </SettingsItem>
                <SettingsItem key="strokeFadeDuration" {...deckSettingsItemProps}>
                    <input type="number" step="1" bind:value={config.strokeFadeDuration}>
                </SettingsItem>
                <a class="button" href="{base}/settings/leniency-calibration" aria-label="Test Leniency Calibration">
                    <i class="fa-solid fa-sliders"></i>&nbsp;
                    Test Writer
                </a>
            </div>
        </div>
        
        
        <div class="settings-section">
            <div class="section-title">FSRS</div>
            <div class="section-container">
                <SettingsItem key="learningSteps" {...deckSettingsItemProps}>
                    <input type="text" 
                        bind:value={learningStepsString} 
                        class:invalid={!isLearningStepsStringValid}
                    >
                </SettingsItem>
                <SettingsItem key="previouslyStudiedLearningSteps" {...deckSettingsItemProps}>
                    <input type="text" 
                        bind:value={previouslyStudiedLearningStepsString} 
                        class:invalid={!isPreviouslyStudiedLearningStepsStringValid}
                    >
                </SettingsItem>
                <SettingsItem key="desiredRetention" {...deckSettingsItemProps}>
                    <div style="display: flex; flex-direction: row; align-items: center; gap: 0.5em;">
                        <input type="number" bind:value={config.desiredRetention} step="0.01">
                    </div>
                </SettingsItem>
                <SettingsItem key="enableShortTerm" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.enableShortTerm}>
                </SettingsItem>
                <SettingsItem key="enableFuzz" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.enableFuzz}>
                </SettingsItem>
                <SettingsItem key="FSRSParams" {...deckSettingsItemProps}>
                    <textarea bind:value={fsrsParamsString} class:invalid={!isFSRSParamsStringValid}></textarea>
                </SettingsItem>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-title">Chinese</div>
            <div class="section-container">
                <SettingsItem key="zhAlwaysShowReading" inputKey="zh.alwaysShowReading" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.zh.alwaysShowReading}>
                </SettingsItem>
                <SettingsItem key="zhMandarinReading" inputKey="zh.mandarinReading" {...deckSettingsItemProps}>
                    <select bind:value={config.zh.mandarinReading}>
                        <option value={ChineseMandarinReading.Pinyin}>Pinyin (wén)</option>
                        <option value={ChineseMandarinReading.PinyinNumeric}>Numeric (wen2)</option>
                        <option value={ChineseMandarinReading.Zhuyin}>Zhuyin (ㄨㄣˊ)</option>
                    </select>
                </SettingsItem>
                <SettingsItem key="zhPlayAudio" inputKey="zh.playAudio" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.zh.playAudio}>
                </SettingsItem>
                <SettingsItem key="zhUseAiGeneratedAudioForMissingAudio" inputKey="zh.useAiGeneratedAudioForMissingAudio" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.zh.useAiGeneratedAudioForMissingAudio}>
                </SettingsItem>
                <SettingsItem key="zhForceStopAudioOnNextCard" inputKey="zh.forceStopAudioOnNextCard" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.zh.forceStopAudioOnNextCard}>
                </SettingsItem>
                
                {#if !data.deckId}
                <a class="button" href="{base}/settings/audio-settings" aria-label="Audio Settings">
                    <i class="fa-solid fa-sliders"></i>&nbsp;
                    More Audio Settings
                </a>
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
                {/if}
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-title">Dictionary</div>
            <div class="section-container">
                <SettingsItem key="isShowPlecoLink" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.isShowPlecoLink}>
                </SettingsItem>
                <SettingsItem key="isShowDongLink" {...deckSettingsItemProps}>
                    <input type="checkbox" bind:checked={config.isShowDongLink}>
                </SettingsItem>
            </div>
        </div>

        {#if !isTauri() && !isLoggedIn && !data.deckId}
            <div class="settings-section" id="data-export-reminder">
                <div class="section-title">Data Export Reminder</div>
                <div class="section-container">
                    <div class="note">
                        Browser storage may be cleared by browser/site data cleanup. Enable reminders to periodically export your profile as a backup.
                    </div>
                    <SettingsItem key="dataExportReminderEnabled">
                        <input type="checkbox" bind:checked={dataExportReminderEnabled}>
                    </SettingsItem>
                    <SettingsItem key="dataExportReminderPeriod">
                        <select bind:value={dataExportReminderPeriod} disabled={!dataExportReminderEnabled}>
                            <option value="daily">daily</option>
                            <option value="2day">2day</option>
                            <option value="3day">3day</option>
                            <option value="4day">4day</option>
                            <option value="weekly">weekly</option>
                            <option value="monthly">monthly</option>
                        </select>
                    </SettingsItem>
                </div>
            </div>
        {/if}
        
        <!--
        <div class="settings-section">
            <div class="section-title">Experimental</div>
            <div class="section-container">
                <SettingsItem key="experimentalApplePencilFix">
                    <input type="checkbox" bind:checked={config._experimentalFixApplePencil}>
                </SettingsItem>
            </div>
        </div>
        -->
                
        {#if !data.deckId}
        <div class="settings-section">
            <div class="section-title">Offline Data</div>
            <div class="section-container">
                {#if !isTauri()}
                    <div class="note">
                        This app can be installed as PWA and can be accessed offline.
                    </div>
                    <button class="button" onclick={() => showPWAInstallDialog()}>
                        <i class="fa-solid fa-download"></i>&nbsp;
                        Install as PWA
                    </button>
                {/if}
                <a class="button" href={`${base}/offline-data`} aria-label="Offline Data">
                    <i class="fa-solid fa-gear"></i>&nbsp;
                    Go to Offline Data Settings
                </a>
            </div>
        </div>
        {/if}
        
        {#if !data.deckId}
        <div class="settings-section">
            <div class="section-container">
                <button class="button" onclick={() => resetConfigToDefault()}>Reset to Default Settings</button>
                <a href="{base}/account" class="button danger-button">
                    <i class="fa-solid fa-trash"></i>&nbsp;
                    Request Account Deletion
                </a>
            </div>
        </div>
        {/if}
        
        {#if !data.deckId}
        <div class="settings-section">
            <!-- <div class="section-title"></div> -->
            <div class="section-container">
                <a class="button" href="{base}/about" aria-label="About">
                    <i class="fa-solid fa-circle-info"></i>&nbsp;
                    About
                </a>
                <a class="button" href="{base}/faq" aria-label="FAQ">
                    <i class="fa-solid fa-circle-question"></i>&nbsp;
                    FAQ
                </a>
                <a class="button" href="https://github.com/ray-pH/wenbun" aria-label="GitHub Repository" target="_blank">
                    <i class="fa-brands fa-github"></i>&nbsp;
                    GitHub Repository
                </a>
                <a class="button" href="https://discord.gg/pVUuqJqywt" aria-label="Discord Community Server" target="_blank">
                    <i class="fa-brands fa-discord"></i>&nbsp;
                    Discord Community Server
                </a>
            </div>
        </div>
        {/if}
    {/if}
</div>
{#if !isTauri()}
    <pwa-install name="WenBun" bind:this={pwaInstallComponent}></pwa-install>
{/if}

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
    .top-settings-section {
        width: 100%;
        padding: 0 1em;
        max-width: 25em;
        box-sizing: border-box;
        display: flex;
        gap: 0.5em;
        margin-bottom: 2em;
        &.floating {
            padding: 0;
            margin-bottom: 0;
        }
    }
    .settings-section {
        width: 100%;
        padding: 0 1em;
        max-width: 25em;
        box-sizing: border-box;
    }
    :global(#data-export-reminder) {
        scroll-margin-top: 6em;
    }
    :global(#data-export-reminder:target) {
        border-radius: 0.5em;
        animation: flash-reminder-section 1.8s ease-out;
    }
    @keyframes flash-reminder-section {
        0% {
            box-shadow: 0 0 0 0 rgba(62, 146, 204, 0.65);
            background-color: rgba(62, 146, 204, 0.18);
        }
        100% {
            box-shadow: 0 0 0 0.8em rgba(62, 146, 204, 0);
            background-color: transparent;
        }
    }
    .settings-section:not(.no-line)::after {
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
    input:invalid {
        background-color: var(--wenbun-red);
    }
    
    .hidden-button {
        display: none;
    }
    
    .next-key-button-container {
        display: flex;
        flex-direction: column;
        gap: 0.2em;
        margin-bottom: 0.5em;
        .is-editing {
            span {
                display: none;
            }
        }
        .is-editing::after {
            content: "...";
        }
        .next-key-button-key-button {
            width: 8em;
            cursor: pointer;
        }
    }
</style>