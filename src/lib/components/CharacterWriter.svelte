<script lang="ts">
    import * as FSRS from "ts-fsrs"
    import HanziWriter from 'hanzi-writer';
    import { onMount } from 'svelte';
    import { getAudioUrl, TONE_PREFIX } from '$lib/chinese';
    import { type CharacterWriterData, type CharacterWriterConfig, parseIntOrUndefined } from '$lib/util';
    import type { App } from '$lib/app';
    import { base } from '$app/paths';
    import { AudioSequence } from '$lib/audioSequence';
    import { AutoReviewGradeClass, AutoReviewGradeFAClass, AutoReviewGradeLabel, type AutoReviewData } from '$lib/autoReview';
    
    let width = $state(500);
    let height = $state(500);
    let gridStroke = "#DDD";
    const NEXT_CHAR_DELAY = 500;
    // const correctSound = new Audio(`${base}/assets/sounds/rightanswer-95219.mp3`);
    const correctSound = new Audio(`${base}/assets/sounds/correct-choice-43861.mp3`);
    let audios: AudioSequence[] = $state([]);
    let isComplete = $state(false);
    let isStopPlayAudio = $state(false); // so we know to play audio only once
    let unmounted = $state(false);
    
    let autoReviewData: AutoReviewData  = $state({
        correctStrokeCount: 0,
        incorrectStrokeCount: 0,
        totalStrokeCount: 0,
    });

    function getEmInPx(): number {
        return parseFloat(getComputedStyle(document.documentElement).fontSize);
    }
    function updateWidth() {
        const emPx = getEmInPx() * 3 * 2;
        width = Math.min(document.documentElement.clientWidth - emPx, 500);
        height = width;
    }
    
    interface Props {
		onComplete: (data: AutoReviewData) => void;
		onRequestManualGrade: () => void;
		characterData: CharacterWriterData | undefined;
		cardConfig: CharacterWriterConfig;
		autoGrade: FSRS.Grade | undefined;
		app: App
	}
    let { 
        onComplete, onRequestManualGrade, 
        characterData, app, cardConfig, autoGrade 
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
                onComplete({...autoReviewData});
                isComplete = true;
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
        }
        const tone = getChineseTone(characterData.tags[index] ?? []);
        writer = HanziWriter.create('grid-background-target', characterData.characters[index], {
            width: width,
            height: height,
            padding: 5,
            showCharacter: false, 
            showOutline: cardConfig.isFirstTime,
            highlightOnComplete: false,
            strokeColor: app.getChineseToneColor(tone) ?? "#555",
            onComplete: () => {
                completeChar();
            }
        });
        if (!cardConfig.isFirstTime) {
            writer.quiz({
                onMistake: () => { 
                    autoReviewData.incorrectStrokeCount++; 
                    autoReviewData.totalStrokeCount++;
                },
                onCorrectStroke: () => { 
                    autoReviewData.correctStrokeCount++; 
                    autoReviewData.totalStrokeCount++;
                },
            });
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
        // random index
        const index = Math.floor(Math.random() * audios.length);
        const a = audios[index];
        a.stop();
        a.play();
    }
    
    onMount(() => {
        updateWidth();
        setupAudios();
        window.addEventListener('resize', updateWidth);
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
        padding: 2em;
        background-color: #FFFFFF90;
        border-radius: 0.5em;
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
        align-items: center;
    }
    .new-element-indicator {
        color: white;
        background-color: #3E92CC;
        padding: 0.5em 3em;
        border-radius: 0.5rem;
        &.is-hidden {
            visibility: hidden;
        }
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
        &.good { --color: #419E6F;}
        &.hard { --color: #DA8C22;}
        &.again { --color: #DB6B6C;}
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
            <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} id="grid-background-target">
            <line x1="0" y1="0" x2={width} y2={height} stroke={gridStroke} />
            <line x1={width} y1="0" x2="0" y2={height} stroke={gridStroke} />
            <line x1={width/2} y1="0" x2={width/2} y2={height} stroke={gridStroke} />
            <line x1="0" y1={height/2} x2={width} y2={height/2} stroke={gridStroke} />
            </svg>
        </div>
        <div class="bottom-container">
            {#if characterData?.characters}
                <div class="new-element-indicator" class:is-hidden={!cardConfig.isFirstTime}>
                    New Card
                </div>
                <div class="character-box-container">
                    {#each characterData.characters as character, i}
                        {#if i < completedCharCount || cardConfig.isFirstTime}
                            <span>{character}</span>
                        {:else}
                            <span class="empty-character-box">&#x3000;</span>
                        {/if}
                    {/each}
                </div>
            {/if}
        </div>
        {#if autoGrade}
            <button 
                class={`auto-review-indicator-container ${AutoReviewGradeClass[autoGrade]}`}
                onclick={() => onRequestManualGrade()}
            >
                <i class={AutoReviewGradeFAClass[autoGrade]}></i>
                <span>{AutoReviewGradeLabel[autoGrade]}</span>
            </button>
        {/if}
    </div>
</div>