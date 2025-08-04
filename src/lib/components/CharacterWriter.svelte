<script lang="ts">
    import HanziWriter from 'hanzi-writer';
    import { onMount } from 'svelte';
    import { getAudioUrl, TONE_PREFIX } from '$lib/chinese';
    import { type CharacterWriterData, type CharacterWriterConfig, parseIntOrUndefined } from '$lib/util';
    import type { App } from '$lib/app';
    import { base } from '$app/paths';
    import { AudioSequence } from '$lib/audioSequence';
    
    let width = $state(500);
    let height = $state(500);
    let gridStroke = "#DDD";
    const NEXT_CHAR_DELAY = 500;
    // const correctSound = new Audio(`${base}/assets/sounds/rightanswer-95219.mp3`);
    const correctSound = new Audio(`${base}/assets/sounds/correct-choice-43861.mp3`);
    let audios: AudioSequence[] = $state([]);
    let isComplete = $state(false);
    let unmounted = $state(false);

    function getEmInPx(): number {
        return parseFloat(getComputedStyle(document.documentElement).fontSize);
    }
    function updateWidth() {
        const emPx = getEmInPx() * 3 * 2;
        width = Math.min(document.documentElement.clientWidth - emPx, 500);
        height = width;
    }
    
    interface Props {
		onComplete: () => void;
		characterData: CharacterWriterData | undefined;
		cardConfig: CharacterWriterConfig;
		app: App
	}
    let { onComplete, characterData, app, cardConfig }: Props = $props();
    
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
                onComplete();
                isComplete = true;
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
            writer.quiz();
        } else {
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
        console.log(urls);
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
    </div>
</div>