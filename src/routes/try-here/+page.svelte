<script lang="ts">
    import { onMount } from 'svelte';
    import * as FSRS from 'ts-fsrs';
    import { App } from '$lib/app';
    import CharacterWriter from '$lib/components/CharacterWriter.svelte';
    import { ChineseCharacterWordlist, TONE_PREFIX } from '$lib/chinese';
    import { AutoReview, type AutoReviewData } from '$lib/autoReview';
    import SlideablePopup from '$lib/components/SlideablePopup.svelte';
    import ZhDict from '$lib/components/ZhDict.svelte';
    import { parseIntOrUndefined, type CharacterWriterConfig, type CharacterWriterData } from '$lib/util';

    const TRY_WORD = '文';

    let app = new App();
    let wordlist = new ChineseCharacterWordlist();

    let isReady = false;
    let characterData: CharacterWriterData | undefined = undefined;
    let isCharSupportedByHanziWriter: boolean[] = [true];

    let isComplete = false;
    let isRequestManualGrade = false;
    let autoGrade: FSRS.Grade | undefined = undefined;
    let autoReviewData: AutoReviewData = {
        correctStrokeCount: 0,
        incorrectStrokeCount: 0,
        totalStrokeCount: 0
    };

    let writerKey = 0;
    let showDictModal = false;
    let phase: 'training' | 'review' = 'training';

    const deckId = '';

    function getChineseTone(tags: string[]): number | undefined {
        for (const tag of tags) {
            if (tag.startsWith(TONE_PREFIX)) {
                return parseIntOrUndefined(tag.substring(TONE_PREFIX.length));
            }
        }
    }

    function getDictCharData() {
        return {
            characters: characterData?.characters ?? TRY_WORD,
            tones: characterData?.tags.map(tags => getChineseTone(tags) ?? 5) ?? [5],
            meaning: characterData?.meanings[0] ?? ''
        };
    }

    function getCardConfig(): CharacterWriterConfig {
        return {
            isFirstTime: phase === 'training',
            isWarmUp: false,
            isFinalWarmUp: false,
            warmUpCount: 0,
            warmUpMaxCount: app.getMaxWarmUpCount(),
            isGradeWarmUpCards: false,
            isShowOutline: phase === 'training',
            lang: 'zh'
        };
    }

    function resetWriter() {
        isComplete = false;
        isRequestManualGrade = false;
        autoGrade = undefined;
        autoReviewData = {
            correctStrokeCount: 0,
            incorrectStrokeCount: 0,
            totalStrokeCount: 0
        };

        const config = app.getConfig(null);
        characterData = wordlist.getCharacterWriterData(TRY_WORD, {
            convertToTraditional: false,
            mandarinReading: config.zh.mandarinReading,
            isCantonese: false,
            isPlayAudio: config.zh.playAudio
        });

        isCharSupportedByHanziWriter = Array.from(TRY_WORD).map((char) =>
            wordlist.isCharSupportedByHanziWriter(char)
        );

        writerKey += 1;
    }

    function startReviewFromTraining() {
        phase = 'review';
        resetWriter();
    }

    function onComplete(data: AutoReviewData) {
        autoReviewData = data;
        autoGrade = AutoReview.getGrade(data);
        isComplete = true;
    }

    function onOpenDict() {
        showDictModal = true;
    }

    function onReadyToGoNext() {
        // Single-word demo, so no next-card flow.
    }

    onMount(async () => {
        await app.init(null);
        await wordlist.init(
            'zh',
            false,
            app.getConfig(null).zh.useAiGeneratedAudioForMissingAudio,
            app.getBlacklistAudioSrc()
        );
        isReady = true;
        resetWriter();
    });
</script>

<div class="try-here-container">
    {#if isReady && characterData}
        {#key writerKey}
            <CharacterWriter
                app={app}
                deckId={deckId}
                isShowHealthBar={app.getConfig(null).showAutoGradingBar}
                isFailWholeWord={app.getConfig(null).failWholeWord}
                isCharSupportedByHanziWriter={isCharSupportedByHanziWriter}
                isDictationMode={false}
                characterData={characterData}
                onComplete={(data) => onComplete(data)}
                onOpenDict={() => onOpenDict()}
                onReadyToGoNext={() => onReadyToGoNext()}
                bind:isRequestManualGrade={isRequestManualGrade}
                cardConfig={getCardConfig()}
                autoGrade={autoGrade}
                bind:autoReviewData={autoReviewData}
                writingMode={app.getConfig(null).writingMode}
            />
        {/key}

        <div class="actions">
            {#if phase === 'training'}
                <button class="button learn-button" onclick={() => startReviewFromTraining()}>
                    Learn
                </button>
            {:else}
                <button class="button retry-button" onclick={() => resetWriter()}>
                    Try Again
                </button>
            {/if}
        </div>
    {:else}
        <div class="loading">Loading…</div>
    {/if}
</div>

<SlideablePopup bind:isOpen={showDictModal} onClose={() => (showDictModal = false)}>
    <ZhDict
        charData={getDictCharData()}
        wordlist={wordlist}
        toneColors={app.getChineseToneColorArray()}
        zhReading={app.getConfig(null).zh.mandarinReading}
        isShowPlecoLink={app.getConfig(null).isShowPlecoLink}
        isShowDongLink={app.getConfig(null).isShowDongLink}
    />
</SlideablePopup>

<style>
    .try-here-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0.5em 0 1em;
    }

    .actions {
        margin-top: 0.75em;
        display: flex;
        justify-content: center;
    }

    .learn-button,
    .retry-button {
        min-width: 8em;
    }

    .learn-button {
        font-weight: 700;
    }

    .loading {
        margin-top: 1em;
        color: #666;
    }
</style>