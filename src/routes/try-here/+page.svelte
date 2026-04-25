<script lang="ts">
    import { onMount } from 'svelte';
    import * as FSRS from 'ts-fsrs';
    import { App } from '$lib/app';
    import CharacterWriter from '$lib/components/CharacterWriter.svelte';
    import { ChineseCharacterWordlist, TONE_PREFIX } from '$lib/chinese';
    import { AutoReview, type AutoReviewData } from '$lib/autoReview';
    import SlideablePopup from '$lib/components/SlideablePopup.svelte';
    import ZhDict from '$lib/components/ZhDict.svelte';
    import TopBar from '$lib/components/TopBar.svelte';
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

<TopBar title="Try here" noBack={true} isSettings={true}></TopBar>
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
            <div class="review-button-container">
                {#if phase === 'training'}
                    <button
                        class="review-button review-button-easy is-complete main-button"
                        onclick={() => startReviewFromTraining()}
                    >
                        <div class="review-button-inner">
                            <div class="review-time">&nbsp;</div>
                            <div class="review-label">Learn</div>
                        </div>
                    </button>
                {:else}
                    <button
                        class="review-button review-button-easy is-complete main-button"
                        onclick={() => resetWriter()}
                    >
                        <div class="review-button-inner">
                            <div class="review-time">&nbsp;</div>
                            <div class="review-label">Try Again</div>
                        </div>
                    </button>
                {/if}
            </div>
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
        padding: 0.5em 0 calc(6em + var(--safe-bottom, 0em));
    }

    .actions {
        position: fixed;
        bottom: 0;
        width: 100vw;
        display: flex;
        justify-content: center;
        padding: 0.5em 0 calc(0.8em + var(--safe-bottom, 0em));
        box-sizing: border-box;
        background-color: #E0E0E0;
        z-index: 20;
    }

    .review-button-container {
        width: 100vw;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
    }

    .review-button {
        all: unset;
        position: relative;
        cursor: pointer;
        color: var(--color, var(--wenbun-blue));
        padding: 0.5em 0;
        flex-grow: 1;
        max-width: 8.5em;
        border-radius: 0.5em;
        background-color: #E0E0E090;
        text-align: center;
    }

    .review-button.main-button {
        min-width: min(8.5em, 35vw);
    }

    .review-button-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .review-time {
        min-height: 1.1em;
        font-size: 0.9em;
    }

    .review-label {
        font-weight: bold;
        padding: 0.2em 0;
    }

    .review-button.review-button-easy {
        --color: var(--wenbun-blue);
    }

    .review-button:hover {
        background-color: lightgray;
    }

    .review-button::after {
        content: '';
        position: absolute;
        left: 10%;
        bottom: 0;
        width: 80%;
        height: 0.3em;
        background-color: var(--color, var(--wenbun-blue));
        border-radius: 0.2em;
        z-index: 1;
    }

    .loading {
        margin-top: 1em;
        color: #666;
    }
</style>