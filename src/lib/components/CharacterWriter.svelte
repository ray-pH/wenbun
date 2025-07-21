<script lang="ts">
    import HanziWriter from 'hanzi-writer';
    import { onMount } from 'svelte';
    import { TONE_PREFIX } from '$lib/chinese';
    import { type CharacterWriterData, type CharacterWriterConfig, parseIntOrUndefined } from '$lib/util';
    import type { App } from '$lib/app';
    
    let width = 500;
    let height = 500;
    let gridStroke = "#DDD";
    const NEXT_CHAR_DELAY = 500;
    // const correctSound = new Audio('/assets/sounds/rightanswer-95219.mp3');
    const correctSound = new Audio('/assets/sounds/correct-choice-43861.mp3');
    
    interface Props {
		onComplete: () => void;
		characterData: CharacterWriterData | undefined;
		app: App
	}
    let { onComplete, characterData, app }: Props = $props();
    
    let completedCharCount: number = $state(0);
    let cardConfig: CharacterWriterConfig = {
        isFirstTime: false,
        isQuiz: true
    }
    let meaningStr = characterData?.meanings.join("; ");
    
    function getChineseTone(tags: string[]): number | undefined {
        for (const tag of tags) {
            if (tag.startsWith(TONE_PREFIX)) {
                return parseIntOrUndefined(tag.substring(TONE_PREFIX.length));
            }
        }
    }
    function completeChar() {
        correctSound.play();
        completedCharCount = completedCharCount + 1;
        if (completedCharCount == characterData?.characters.length) {
            onComplete();
        } else {
            window.setTimeout(() => {
                setupHanziWriter(completedCharCount);
                // play sound
            }, NEXT_CHAR_DELAY);
        }
    }
    let writer: HanziWriter;
    function setupHanziWriter(index: number) {
        if (!characterData) return;
        if (writer) {
            writer.cancelQuiz();
            writer.hideCharacter();
        }
        const tone = getChineseTone(characterData.tags[index] ?? []);
        writer = HanziWriter.create('grid-background-target', characterData.characters[index], {
          width: width,
          height: height,
          padding: 5,
          showCharacter: false, showOutline: false,
          highlightOnComplete: false,
          strokeColor: app.getChineseToneColor(tone) ?? "#555",
          onComplete: () => {
              completeChar();
          }
        });
        if (cardConfig.isQuiz) {
            writer.quiz();
        }
    }
    
    onMount(() => {
        setupHanziWriter(0);
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
        height: 5em;
        overflow-y: scroll;
        /* min-height: 8em; */
        margin: 0.5em;
        margin-bottom: 2em;
    }
    .reading {
        font-size: 2em;
        margin: 0.5em;
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
        margin-top: 0.5em;
        padding-right: 0.5em;
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
</style>

<div class="character-writer">
    <div class="reading">{characterData?.reading}</div>
    <div class="meaning">{meaningStr}</div>
    <div class="character-container">
        <div class="grid-background">
            <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} id="grid-background-target">
            <line x1="0" y1="0" x2={width} y2={height} stroke={gridStroke} />
            <line x1={width} y1="0" x2="0" y2={height} stroke={gridStroke} />
            <line x1={width/2} y1="0" x2={width/2} y2={height} stroke={gridStroke} />
            <line x1="0" y1={height/2} x2={width} y2={height/2} stroke={gridStroke} />
            </svg>
        </div>
        {#if characterData?.characters}
            <div class="character-box-container">
                {#each characterData.characters as character, i}
                    {#if i < completedCharCount}
                        <span>{character}</span>
                    {:else}
                        <span class="empty-character-box">&#x3000;</span>
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
</div>