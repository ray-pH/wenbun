<script lang="ts">
    import { onMount } from "svelte";
    import { App, NewCardOrder, type WenbunConfig } from "$lib/app";
    import TopBar from "$lib/components/TopBar.svelte";
    import _ from "lodash";
    import SettingsItem from "./SettingsItem.svelte";
    
    let app = new App();
    let config: WenbunConfig;
    onMount(async () => {
        await app.init();
        config = _.cloneDeep(app.getConfig());
        app = app;
    })
    
</script>

<!-- TODO: setup proper backUrl -->
<TopBar title="Settings" backUrl="/" isSettings={true}></TopBar>
<div class="main-container">
    {#if config}
        <div class="settings-section">
            <div class="section-title">Learning</div>
            <div class="section-container">
                <SettingsItem label="New Card Per Day">
                    <input type="number" bind:value={config.newCardPerDay}>
                </SettingsItem>
                <SettingsItem label="Max Reviews Per Day">
                    <input type="number" bind:value={config.maxReviewsPerDay}>
                </SettingsItem>
                <SettingsItem label="New Card Order">
                    <select bind:value={config.newCardOrder}>
                        <option value={NewCardOrder.Mix}>Mix</option>
                        <option value={NewCardOrder.AfterReviews}>After Reviews</option>
                        <option value={NewCardOrder.BeforeReviews}>Before Reviews</option>
                    </select>
                </SettingsItem>
                <SettingsItem label="New Already Learning Card Per Day">
                    <input type="number" bind:value={config.newAlreadyLearningCardPerDay}>
                </SettingsItem>
                <SettingsItem label="New Already Learning Card Order">
                    <select bind:value={config.newAlreadyLearningCardOrder}>
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
                <SettingsItem label="Learning Steps">
                    TODO
                </SettingsItem>
                <SettingsItem label="Already Learning Learning Steps">
                    TODO
                </SettingsItem>
                <SettingsItem label="Desired Retention">
                    <input type="number" bind:value={config.desiredRetention}>
                    <span>%</span>
                </SettingsItem>
                <SettingsItem label="Enable Short Term">
                    <input type="checkbox" bind:checked={config.enableShortTerm}>
                </SettingsItem>
                <SettingsItem label="Enable Fuzz">
                    <input type="checkbox" bind:checked={config.enableFuzz}>
                </SettingsItem>
                <SettingsItem label="FSRS Params">
                    TODO
                </SettingsItem>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-title">Chinese</div>
            <div class="section-container">
                <SettingsItem label="Color The Characters Based On Their Tone">
                    <input type="checkbox" bind:checked={config.zh.isColorBasedOnTone}>
                </SettingsItem>
                <SettingsItem label="Tone Colors">
                    TODO
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
    .section-container {
        input {
            width: 5em;
        }
    }
</style>