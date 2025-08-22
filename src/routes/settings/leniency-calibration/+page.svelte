<script lang="ts">
    import { base } from "$app/paths";
    import TopBar from "$lib/components/TopBar.svelte";
    import HanziWriter from "hanzi-writer";
    import { onMount } from "svelte";
    import SettingsItem from "../SettingsItem.svelte";
    import { App } from "$lib/app";
    import { CHARACTER_WRITER_DRAWING_WIDTH, SETTINGS_LABEL_DATA } from "$lib/constants";
    import { LENIENCY_CHARS } from "./leniency-chars";
    
    let width = $state(500);
    let height = $state(500);
    let gridStroke = "#DDD";
    function getEmInPx(): number {
        return parseFloat(getComputedStyle(document.documentElement).fontSize);
    }
    function updateWidth() {
        const emPx = getEmInPx() * 3 * 2;
        width = Math.min(document.documentElement.clientWidth - emPx, 500);
        height = width;
    }
    
    let writer: HanziWriter;
    let chara = $state('被');
    function setupHanziWriter(leniency: number) {
        writer = HanziWriter.create('grid-background-target', chara, {
            width: width,
            height: height,
            padding: 5,
            showCharacter: false, 
            showOutline: false,
            highlightOnComplete: false,
            strokeColor: "#555",
            drawingWidth: CHARACTER_WRITER_DRAWING_WIDTH,
        });
        resetHanziWriter(leniency, chara);
    }
    function resetHanziWriter(leniency: number, newChar: string) {
        if (!writer) return;
        if (chara !== newChar) {
            chara = newChar;
            writer.setCharacter(chara);
        }
        writer.cancelQuiz();
        writer.quiz({
            leniency,
        });
    }
    
    $effect(() => {
        resetHanziWriter(leniency, chara);
    })
    
    let leniency = $state(1.0);
    onMount(() => {
        updateWidth();
        setupHanziWriter(leniency);
        window.addEventListener('resize', updateWidth);
        return () => {
            window.removeEventListener('resize', updateWidth);
        };
    })

    function randomizeChar() {
        const newChar = LENIENCY_CHARS[Math.floor(Math.random() * LENIENCY_CHARS.length)];
        resetHanziWriter(leniency, newChar);
    }
</script>

<TopBar title="Leniency Calibration" backUrl="{base}/settings?leniency={leniency}" isSettings={true}></TopBar>
<div class="main-container">
    
    <div class="section-container">
        <label class="settings-label">
            <div>
                <div class="settings-label-title">{SETTINGS_LABEL_DATA['strokeLeniency'].label}</div>
                <div class="settings-label-help">{SETTINGS_LABEL_DATA['strokeLeniency'].help}</div>
            </div>
            <div class="settings-children">
                <input type="number" step="0.01" bind:value={leniency}>
            </div>
        </label>
    </div>
    
    <div class="character-display">
        <div>
            character:
            <input type="text" bind:value={chara}>
        </div>
        <div>
            <button class="button" onclick={() => randomizeChar()}>Random</button>
        </div>
    </div>
    
    <div class="character-container">
        <div class="grid-background">
            <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} id="grid-background-target">
            <line x1="0" y1="0" x2={width} y2={height} stroke={gridStroke} />
            <line x1={width} y1="0" x2="0" y2={height} stroke={gridStroke} />
            <line x1={width/2} y1="0" x2={width/2} y2={height} stroke={gridStroke} />
            <line x1="0" y1={height/2} x2={width} y2={height/2} stroke={gridStroke} />
            </svg>
        </div>
    </div>
</div>

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    .grid-background {
        padding: 2em;
        background-color: #FFFFFF90;
        border-radius: 0.5em;
    }
    .character-display {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 1em;
        margin: 1em 0;
    }
    .character-display input {
        width: 2em;
        font-size: 1.5em;
    }
    .character-container {
        position: relative;
        display: flex;
        flex-direction: column;
    }
    .section-container {
        width: 100%;
        padding: 0 1em;
        max-width: 25em;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 1em;
        margin: 1em 0;
        input {
            width: 5em;
        }
    }
    .settings-label {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        .settings-label-help {
            color: #00000090;
            font-size: 0.8em;
            max-width: 24em;
        }
    }
</style>