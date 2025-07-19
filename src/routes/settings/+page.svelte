<script lang="ts">
    import { onMount } from "svelte";
    import { App, NewCardOrder, type WenbunConfig } from "$lib/app";
    import TopBar from "$lib/components/TopBar.svelte";
    import _ from "lodash";
    import SettingsItem from "./SettingsItem.svelte";
    import * as FSRS from "ts-fsrs"
    import { type DeepRequired } from "$lib/util";
    import { ChineseToneColorPalette } from "$lib/constants";
    
    let app = new App();
    let config: DeepRequired<WenbunConfig>;
    onMount(async () => {
        await app.init();
        config = _.cloneDeep(app.getConfig());
        learningStepsString = config.learningSteps.join(" ");
        previouslyStudiedLearningStepsString = config.previouslyStudiedLearningSteps.join(" ");
        fsrsParamsString = config.FSRSParams.join(",");
        app = app;
    })
    
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
    
    
</script>

<!-- TODO: setup proper backUrl -->
<TopBar title="Settings" backUrl="/" isSettings={true}></TopBar>
<div class="main-container">
    {#if config}
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
    }
    .settings-section {
        width: 25em;
    }
    .settings-section::after {
        width: 23em;
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
</style>