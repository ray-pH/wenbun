<script lang="ts">
    import * as FSRS from "ts-fsrs"
    import HanziWriter from 'hanzi-writer';
    import { onMount } from 'svelte';
    import { getAudioUrl, TONE_PREFIX } from '$lib/chinese';
    import { type CharacterWriterData, type CharacterWriterConfig, parseIntOrUndefined, lerp, linmap } from '$lib/util';
    import type { App } from '$lib/app';
    import { base } from '$app/paths';
    import { AudioSequence } from '$lib/audioSequence';
    import { AutoReview, AutoReviewGradeClass, AutoReviewGradeFAClass, AutoReviewGradeLabel, type AutoReviewData } from '$lib/autoReview';
    import { CHARACTER_WRITER_DRAWING_WIDTH } from "$lib/constants";
    
    let width = $state(500);
    let height = $state(500);
    let gridLinePad = $state(30);
    let p = $derived(gridLinePad);
    let gridStroke = "#DDD";
    const NEXT_CHAR_DELAY = 500;
    const INDICATOR_FLASH_MS = 1600; // show indicator briefly after fail+reveal
    // const correctSound = new Audio(`${base}/assets/sounds/rightanswer-95219.mp3`);
    const correctSound = new Audio(`${base}/assets/sounds/correct-choice-43861.mp3`);
    let audios: AudioSequence[] = $state([]);
    let isComplete = $state(false);
    let isStopPlayAudio = $state(false); // so we know to play audio only once
    let unmounted = $state(false);
    
    function getEmInPx(): number {
        return parseFloat(getComputedStyle(document.body).fontSize);
    }
    function getUiScale(): number {
        return parseFloat(getComputedStyle(document.body).fontSize) 
            / parseFloat(getComputedStyle(document.documentElement).fontSize);
    }
    function updateWidth() {
        const emPx = getEmInPx() * 2 * 0.8;
        width = Math.min(document.documentElement.clientWidth - emPx, 500) * getUiScale();
        height = width;
        gridLinePad = 0.5 * getEmInPx() * getUiScale();
    }
    
    interface Props {
		onComplete: (data: AutoReviewData) => void;
		onOpenDict: () => void;
		isRequestManualGrade: boolean;
		characterData: CharacterWriterData | undefined;
		cardConfig: CharacterWriterConfig;
		autoGrade: FSRS.Grade | undefined;
		autoReviewData: AutoReviewData;
		isShowHealthBar: boolean;
		app: App;
	}
    let { 
        onComplete, onOpenDict,
        isRequestManualGrade = $bindable(), 
        characterData, app, cardConfig, autoGrade,
        isShowHealthBar = false,
        autoReviewData = $bindable()
    }: Props = $props();
    
    let completedCharCount: number = $state(0);
    let meaningStr = characterData?.meanings.join("; ");
    
    function getChineseTone(tags: string[]): number | undefined {
        for (const tag of tags) {
            if (tag.startsWith(TONE_PREFIX)) {
                return parseIntOrUndefined(tag.substring(TONE_PREFIX.length));
            }
        }
    }
    function completeChar() {
        isStopPlayAudio = true;
        if (unmounted) return;
        if (cardConfig.isFirstTime) {
            completedCharCount = (completedCharCount + 1) % characterData!.characters.length;
            window.setTimeout(() => {
                setupHanziWriter(completedCharCount);
                // play sound
            }, NEXT_CHAR_DELAY);
        } else {
            correctSound.play();
            completedCharCount = completedCharCount + 1;
            if (completedCharCount == characterData?.characters.length) {
                // done;
                onComplete({...autoReviewData});
                isComplete = true;
                surpressGradeIndicator = false;
                window.setTimeout(() => {
                    playAudio();
                }, NEXT_CHAR_DELAY);
            } else {
                window.setTimeout(() => {
                    setupHanziWriter(completedCharCount);
                    // play sound
                }, NEXT_CHAR_DELAY);
            }
        }
    }
    let writer: HanziWriter;
    function setupHanziWriter(index: number) {
        if (unmounted) return;
        if (!characterData) return;
        if (writer) {
            if (!cardConfig.isFirstTime) writer.cancelQuiz();
            writer.hideCharacter();
            writer.hideOutline();
        }
        const tone = getChineseTone(characterData.tags[index] ?? []);
        writer = HanziWriter.create('grid-background-target', characterData.characters[index], {
            width: width,
            height: height,
            padding: 5,
            showCharacter: false, 
            showOutline: cardConfig.isShowOutline,
            highlightOnComplete: false,
            strokeColor: app.getChineseToneColor(tone) ?? "#555",
            // drawing
            drawingWidth: CHARACTER_WRITER_DRAWING_WIDTH,
            drawingColor: "#555",
            // auto stroke animation
            strokeAnimationSpeed: strokeSpeed,
            delayBetweenStrokes: linmap(strokeSpeed, 1, MAX_STROKE_SPEED, 1000, 10),
            delayBetweenLoops: linmap(strokeSpeed, 1, MAX_STROKE_SPEED, 2000, 10),
            onComplete: () => {
                completeChar();
            }
        });
        if (!cardConfig.isFirstTime) {
            writer.quiz({
                leniency: app.getConfig().strokeLeniency,
                onMistake: () => { 
                    autoReviewData.incorrectStrokeCount++; 
                    autoReviewData.totalStrokeCount++;
                },
                onCorrectStroke: () => { 
                    autoReviewData.correctStrokeCount++; 
                    autoReviewData.totalStrokeCount++;
                },
            });
            if (autoReviewData.isFailAndReveal) {
                writer.showOutline();
            }
        } else {
            setTimeout(() => {
                if (!isStopPlayAudio) playAudio();
            }, NEXT_CHAR_DELAY);
            setTimeout(() => {
                writer.animateCharacter({
                    onComplete: () => {
                          setTimeout(() => {
                              writer.hideOutline();
                              writer.hideCharacter();
                              completeChar();
                          }, NEXT_CHAR_DELAY);
                        }
                });
            },  NEXT_CHAR_DELAY);
        }
    }
    
    function setupAudios() {
        const urls = characterData?.audioUrl;
        if (!urls) return;
        audios = urls.map(rawUs => {
            const us = rawUs.map(u => getAudioUrl(cardConfig.lang, u));
            return new AudioSequence(us);
        });
    }
    function playAudio() {
        if (unmounted) return;
        // random index
        const index = Math.floor(Math.random() * audios.length);
        const a = audios[index];
        a.stop();
        a.play();
    }
    
    function toggleRequestManualGrade() {
        if (cardConfig.isWarmUp && (!cardConfig.isGradeWarmUpCards || !cardConfig.isFinalWarmUp)) {
            window.alert("Can't change grade during warm-up, since grading doesn't affect scheduling in this phase.");
            return;
        }
        isRequestManualGrade = !isRequestManualGrade;
    }
    
    function warmUpProgressPercentStr(d = 0): string {
        // d = 1 for nex progress
        const warmUpCount = cardConfig.warmUpCount ?? 0;
        const maxCount = cardConfig.warmUpMaxCount;
        return `${Math.round((warmUpCount + d) / maxCount * 100)}%`;
    }
    
    let surpressGradeIndicator = $state(false);
    export function failAndReveal() {
        if (!writer) return;
        autoReviewData.isFailAndReveal = true;
        writer.showOutline();
        window.setTimeout(() => {
            surpressGradeIndicator = true;
        }, INDICATOR_FLASH_MS);
    }
    
    const MAX_STROKE_SPEED = 5;
    let strokeSpeed = $state(1);
    function toggleStrokeAnimationSpeed() {
        const newSpeed = (strokeSpeed % MAX_STROKE_SPEED) + 1;
        strokeSpeed = newSpeed;
        app.setStrokeSpeed(newSpeed);
    }
    
    
    let healthBarAgainLimit = $state(0);
    let healthBarHardLimit = $state(0);
    async function setupHealthBarCssVar() {
        let total = 0;
        for (const char of characterData?.characters ?? "") {
            const charData = await HanziWriter.loadCharacterData(char);
            if (charData) total += charData.strokes.length;
        }
        const {hard, again} = AutoReview.getGradeMistakeCountLimits(total);
        healthBarAgainLimit = again;
        healthBarHardLimit = hard;
    }
    
    onMount(() => {
        autoReviewData = {
            correctStrokeCount: 0,
            incorrectStrokeCount: 0,
            totalStrokeCount: 0,
            isFailAndReveal: false,
        };
        setupHealthBarCssVar();
        updateWidth();
        setupAudios();
        window.addEventListener('resize', updateWidth);
        strokeSpeed = app.getStrokeSpeed();
        setupHanziWriter(0);
        return () => {
            unmounted = true;
            window.removeEventListener('resize', updateWidth);
        };
    });
</script>

<style>
    .character-writer {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    .meaning {
        max-width: 40em;
        margin: 0.5em;
        font-size: 1.2em;
    }
    .reading-container {
        display: flex;
        flex-direction: row;
        gap: 0.5em;
        margin-bottom: 0.5em;
        &.is-hidden {
            visibility: hidden;
        }
    }
    .reading {
        font-size: 1.2em;
        background-color: #FFFFFF90;
        padding: 0.2em 0.4em;
        border-radius: 0.5rem;
    }
    .audio-button {
        all: unset;
        cursor: pointer;
        &:hover {
            opacity: 0.5;
        }
    }
    .grid-background {
        background-color: #FFFFFF90;
        border-radius: 0.5em;
        touch-action: none;
    }
    .character-container {
        position: relative;
        display: flex;
        flex-direction: column;
    }
    .character-box-container {
        font-size: 2em;
        color: #00000090;
        align-self: end;
        span {
            margin-left: 0.2em;
        }
        .empty-character-box {
            position: relative;
        }
        .empty-character-box::after {
            content: "";
            position: absolute;
            top: 0.2em;
            left: -0.05em;
            right: 0.05em;
            bottom: 0.2em;
            border: 2px dashed;
            pointer-events: none;
        }
    }
    .bottom-container {
        margin-top: 0.5em;
        padding-right: 0.5em;
        display: flex;
        justify-content: space-between;
        gap: 1em;
        align-items: center;
        justify-content: space-between;
        align-items: center;
        gap: 1em;
        min-width: 0;
    }
    .right-side {
        display: flex;
        flex-direction: row;
        gap: 0.5em;
        align-items: center;
        flex: 0 0 auto;         /* keep natural width; indicator shrinks first */
        min-width: 0;           /* safety for inner flex items */
    }
    .dict-button {
        background-color: #FFFFFF90;
        height: fit-content;
        color: black;
    }
    
    @property --p {
      syntax: '<percentage>';
      inherits: false;
      initial-value: 100%;
    }
    .new-element-indicator {
        --p: var(--progress, 100%);
        &.is-complete { --p: var(--next-progress, 100%)}
        transition: --p 300ms ease;
        
        color: white;
        background:
          linear-gradient(var(--wenbun-blue) 0 0) 0 / var(--p) 100% no-repeat,
          #BBB;
        border-radius: 0.5rem;
        &.is-hidden {
            visibility: hidden;
        }
        
        box-sizing: border-box; /* width includes padding */
        padding: 0.5em 1em;
        white-space: nowrap;    /* keep it one line */
        text-align: center;
        /* target width = 12em, can shrink but never grow past it */
        flex: 0 1 12em;         /* grow:0, shrink:1, basis:12em */
        max-inline-size: 12em;  /* don’t exceed target */
        min-inline-size: 6.5em; /* reasonable floor so it doesn’t collapse */
    }
    .auto-review-indicator-container {
        all: unset;
        cursor: pointer;
        background-color : var(--color);
        color: white;
        width: 8em;
        height: 8em;
        display: flex;
        flex-direction: column;
        gap: 0.5em;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        position: absolute;
        top: -1em;
        right: -1em;
        .fa {
            font-size: 3em;
        }
        &:hover { opacity: 0.8; }
        &.easy { --color: var(--wenbun-blue);}
        &.good { --color: var(--wenbun-green);}
        &.hard { --color: var(--wenbun-orange);}
        &.again { --color: var(--wenbun-red);}
        &.blinking {
            animation: blinking 1s ease-in-out infinite;
        }
        &.echo-once::after {
            content: "";
            position: absolute;
            inset: -6px;
            border-radius: 50%;
            border: 6px solid var(--color);
            opacity: 0;
            transform: scale(1);
            z-index: -1;
            animation: ring 1.6s ease-out 1;
        }
    }
    @keyframes blinking {
        0%   { opacity: 1; }
        50%  { opacity: 0.6; }
        100% { opacity: 1; }
    }
    @keyframes ring {
        0%   { transform: scale(1);   opacity: 0; }
        1%   { transform: scale(1);   opacity: 0.6; }
        70%  { transform: scale(1.6); opacity: 0;   }
        100% { transform: scale(1.6); opacity: 0;   }
    }
    .stroke-speed-button {
        all: unset;
        cursor: pointer;
        position: absolute;
        top: 1em;
        left: 1em;
        background-color: #E0E0E0;
        padding: 0.2em 0.5em;
        border-radius: 0.5rem;
    }
    .auto-grade-health-bar {
        position: absolute;
        border-radius: 0.8rem;
        width: 97%;
        top: 1.5%;
        left: 1.5%;
        height: 1%;
        --mistake-count: 10;
        --limit-hard: 20;
        --limit-again: 40;
        --rel-mistake: calc(var(--mistake-count) / var(--limit-again) * 100%);
        --rel-cutoff: calc(var(--limit-hard) / var(--limit-again) * 100%);
        background: linear-gradient(
          to left,
          #00000000 var(--rel-mistake),
          var(--wenbun-green) var(--rel-mistake) var(--rel-cutoff),
          var(--wenbun-orange) max(var(--rel-mistake),var(--rel-cutoff))
        );
    }
</style>

<div class="character-writer">
    <div class="meaning">{meaningStr}</div>
    <div class="reading-container" class:is-hidden={!app.getConfig().zh.alwaysShowReading && !isComplete && !cardConfig.isFirstTime}>
        <div class="reading">
            {characterData?.reading}
        </div>
        {#if audios.length > 0}
            <button class="audio-button" onclick={() => playAudio()} aria-label="Play Audio">
                <i class="fa-solid fa-volume-low"></i>
            </button>
        {/if}
    </div>
    <div class="character-container">
        <div class="grid-background">
                {#if autoReviewData && isShowHealthBar}
                    <div class="auto-grade-health-bar"
                        style={`--mistake-count: ${autoReviewData.incorrectStrokeCount}; --limit-hard: ${healthBarHardLimit}; --limit-again: ${healthBarAgainLimit}`}
                    ></div>
                {/if}
            <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} id="grid-background-target">
            <line x1={p} y1={p} x2={width - p} y2={height - p} stroke={gridStroke} />
            <line x1={width - p} y1={p} x2={p} y2={height - p} stroke={gridStroke} />
            <line x1={width/2} y1={p} x2={width/2} y2={height - p} stroke={gridStroke} />
            <line x1={p} y1={height/2} x2={width - p} y2={height/2} stroke={gridStroke} />
            </svg>
        </div>
        <div class="bottom-container">
            {#if characterData?.characters}
                {#if cardConfig.isFirstTime}
                    <div class="new-element-indicator">New Card</div>
                {:else if cardConfig.isWarmUp}
                    <div class="new-element-indicator" 
                        class:is-complete={isComplete}
                        style:--progress={warmUpProgressPercentStr()}
                        style:--next-progress={warmUpProgressPercentStr(1)}
                    >Warm Up</div>
                {:else}
                    <div class="new-element-indicator is-hidden"></div>
                {/if}
                <div class="right-side">
                    <button class="button dict-button" onclick={() => onOpenDict()}>
                        <i class="fa-solid fa-book"></i>
                        Dict
                    </button>
                    <div class="character-box-container chinese-font">
                        {#each characterData.characters as character, i}
                            {#if i < completedCharCount || cardConfig.isFirstTime}
                                <span>{character}</span>
                            {:else}
                                <span class="empty-character-box">&#x3000;</span>
                            {/if}
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
        {#if cardConfig.isFirstTime}
            <button
                class="stroke-speed-button"
                onclick={() => toggleStrokeAnimationSpeed()}
            >
                {#if strokeSpeed <= 1}
                    <i class="fa-solid fa-play"></i>
                {:else}
                    <i class="fa-solid fa-forward"></i>
                {/if}
                <span>{strokeSpeed}x</span>
            </button>
        {/if}
        {#if autoGrade && !surpressGradeIndicator}
            <button 
                class={`auto-review-indicator-container ${AutoReviewGradeClass[autoGrade]}`}
                class:blinking={isRequestManualGrade}
                class:animated={isRequestManualGrade}
                class:echo-once={!isRequestManualGrade}
                onclick={() => toggleRequestManualGrade()}
            >
                {#if cardConfig.isWarmUp && !cardConfig.isGradeWarmUpCards}
                    <i style="font-size: 2.4em" class="fa fa-solid fa-seedling"></i>
                    <span>New</span>
                {:else}
                    <i class={AutoReviewGradeFAClass[autoGrade]}></i>
                    <span>{AutoReviewGradeLabel[autoGrade]}</span>
                {/if}
            </button>
        {/if}
    </div>
</div>