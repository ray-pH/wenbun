<script lang="ts">
    import HanziWriter from 'hanzi-writer';
    import { onMount } from 'svelte';
    import type { CharacterWriterData, CharacterWriterConfig } from '$lib/util';
    
    let width = 500;
    let height = 500;
    let gridStroke = "#DDD";
    
    interface Props {
		onComplete: () => void;
		characterData: CharacterWriterData | undefined;
	}
    let { onComplete, characterData }: Props = $props();
    
    // export let characterData: CharacterWriterData | undefined = {
    //     characters: '爱',
    //     reading: 'ài',
    //     meanings: [ "to love; to be fond of; to like", "affection", "to be inclined (to do sth); to tend to (happen)" ],
    //     tags: [["tone4"]]
    // }
    let cardConfig: CharacterWriterConfig = {
        isFirstTime: false,
        isQuiz: true
    }
    let meaningStr = characterData?.meanings.join("; ");
    
    let writer: HanziWriter;
    onMount(() => {
        if (!characterData) return;
        writer = HanziWriter.create('grid-background-target', characterData.characters[0], {
          width: width,
          height: height,
          padding: 5,
          showCharacter: false,
          showOutline: false,
          highlightOnComplete: false,
          onComplete: () => {
              onComplete();
          }
        });
        if (cardConfig.isQuiz) {
            writer.quiz();
        }
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
        margin: 1em;
    }
    .reading {
        font-size: 2em;
        margin: 1em;
    }
</style>

<div class="character-writer">
    <div class="meaning">{meaningStr}</div>
    <div class="reading">{characterData?.reading}</div>
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} id="grid-background-target">
      <line x1="0" y1="0" x2={width} y2={height} stroke={gridStroke} />
      <line x1={width} y1="0" x2="0" y2={height} stroke={gridStroke} />
      <line x1={width/2} y1="0" x2={width/2} y2={height} stroke={gridStroke} />
      <line x1="0" y1={height/2} x2={width} y2={height/2} stroke={gridStroke} />
    </svg>
</div>