<script lang="ts">
    import * as FSRS from "ts-fsrs"
    import HanziWriter from 'hanzi-writer';
    import { onMount } from 'svelte';
    import { fetchHanziWriterCharData, getAudioUrl, TONE_PREFIX, WENBUN_TTS_URL } from '$lib/chinese';
    import { type CharacterWriterData, type CharacterWriterConfig, parseIntOrUndefined, lerp, linmap, TRUE } from '$lib/util';
    import { WritingMode, type App } from '$lib/app';
    import { base } from '$app/paths';
    import { AudioSequence } from '$lib/audioSequence';
    import { AutoReview, AutoReviewGradeClass, AutoReviewGradeFAClass, AutoReviewGradeLabel, type AutoReviewData } from '$lib/autoReview';
    import { CHARACTER_WRITER_DRAWING_WIDTH, SLUG_UNSUPPORTED_CHAR_INTERACTION_NEXT, SLUG_UNSUPPORTED_CHAR_INTERACTION_WARNING } from "$lib/constants";
    import ManualWriter from "$lib/manualWriter";
    import ManualWriterResultPreview from './ManualWriterResultPreview.svelte';
    
    let width = $state(500);
    let height = $state(500);
    let gridLinePad = $state(30);
    let p = $derived(gridLinePad);
    let gridStroke = "#DDD";
    let isAudioArtificial = $state(false);
    const NEXT_CHAR_DELAY = 500;
    const UNSUPPORTED_FIRST_TIME_DISPLAY_MS = 2000;
    const INDICATOR_FLASH_MS = 1600; // show indicator briefly after fail+reveal
    // const correctSound = new Audio(`${base}/assets/sounds/rightanswer-95219.mp3`);
    const correctSound = new Audio(`${base}/assets/sounds/correct-choice-43861.mp3`);
    let audios: AudioSequence[] = $state([]);
    let isComplete = $state(false);
    let isStopPlayAudio = $state(false); // so we know to play audio only once
    let unmounted = $state(false);
    let isDisableLoadingIndicator = false;
    let isAudioButtonPressed = $state(false);
    
    let isAudioLoaded = $state(false);
    let isStrokeDataLoaded = $state(false);
    
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

        // Keep ManualWriter controls anchored inside the current SVG bounds
        // when viewport width changes.
        if (writingMode === WritingMode.Manual && activeManualWriter) {
            activeManualWriter.updateDimensions({ width, height });
        }
    }
    
    interface Props {
		onComplete: (data: AutoReviewData) => void;
		onOpenDict: () => void;
		onReadyToGoNext: () => void;
		isRequestManualGrade: boolean;
		isDictationMode: boolean; // EXPERIMENTAL, play audio instead of show meaning
		characterData: CharacterWriterData | undefined;
		cardConfig: CharacterWriterConfig;
		autoGrade: FSRS.Grade | undefined;
		autoReviewData: AutoReviewData;
		isShowHealthBar: boolean;
		// isShowReadingOnFail: boolean;
		isFailWholeWord: boolean;
        isCharSupportedByHanziWriter: boolean[];
		writingMode: WritingMode;
		app: App;
		deckId: string;
	}
    let { 
        onComplete, onOpenDict, onReadyToGoNext,
        isRequestManualGrade = $bindable(), 
        characterData, app, cardConfig, autoGrade,
        isShowHealthBar = false,
        // isShowReadingOnFail = false,
        isFailWholeWord = false,
        isDictationMode = false,
        isCharSupportedByHanziWriter = [],
        writingMode = WritingMode.Default,
        autoReviewData = $bindable(),
        deckId,
    }: Props = $props();
    
    const isDontShowAudioLoadingIfNotPlaying = $derived(
        !(isDictationMode && !cardConfig.isFirstTime)
    );

    let completedCharCount: number = $state(0);
    // svelte-ignore state_referenced_locally
    let meaningStr = characterData?.meanings.join("; ");
    let isRevealReading = $state(false);
    let isDictationModeRevealMeaning = $state(false);
    let isUnsupportedCharRevealed = $state(false);
    // svelte-ignore state_referenced_locally
    let isLongText = (characterData?.characters.length ?? 0) > 3;
    let unsupportedFirstTimeTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
    
    function isCurrentCharSupportedByHanziWriter(): boolean {
        return isCharSupportedByHanziWriter[completedCharCount] ?? true;
    }

    function clearUnsupportedFirstTimeTimeout() {
        if (unsupportedFirstTimeTimeout !== undefined) {
            clearTimeout(unsupportedFirstTimeTimeout);
            unsupportedFirstTimeTimeout = undefined;
        }
    }

    function scheduleUnsupportedFirstTimeAutoAdvance() {
        clearUnsupportedFirstTimeTimeout();
        unsupportedFirstTimeTimeout = setTimeout(() => {
            advanceUnsupportedChar();
        }, UNSUPPORTED_FIRST_TIME_DISPLAY_MS);
    }

    function onUnsupportedCharReady() {
        isStrokeDataLoaded = true;
        if (cardConfig.isFirstTime) {
            isUnsupportedCharRevealed = true;
            scheduleUnsupportedFirstTimeAutoAdvance();
        } else {
            isUnsupportedCharRevealed = false;
        }
    }

    function advanceUnsupportedChar() {
        clearUnsupportedFirstTimeTimeout();
        isUnsupportedCharRevealed = false;
        isStopPlayAudio = true;
        const nextCount = completedCharCount + 1;
        completedCharCount = nextCount;
        if (nextCount >= characterData!.characters.length) {
            onComplete({...autoReviewData});
            isComplete = true;
            surpressGradeIndicator = false;
            window.setTimeout(async () => {
                if (!isDictationMode && audios.length) await playAudio();
                onReadyToGoNext();
            }, NEXT_CHAR_DELAY);
            return;
        }
        if (isCurrentCharSupportedByHanziWriter()) {
            window.setTimeout(() => {
                setupHanziWriter(completedCharCount);
            }, NEXT_CHAR_DELAY);
        } else {
            onUnsupportedCharReady();
        }
    }

    function onUnsupportedCharacterInteraction() {
        if (!characterData?.characters?.length) return;
        if (!isUnsupportedCharRevealed) {
            isUnsupportedCharRevealed = true;
            if (cardConfig.isFirstTime) {
                scheduleUnsupportedFirstTimeAutoAdvance();
            }
            return;
        }
        advanceUnsupportedChar();
    }
    
    function getChineseTone(tags: string[]): number | undefined {
        for (const tag of tags) {
            if (tag.startsWith(TONE_PREFIX)) {
                return parseIntOrUndefined(tag.substring(TONE_PREFIX.length));
            }
        }
    }
    let animationDontGoToNextChar = $state(false);
    function completeChar(delayOverride?: number) {
        isStopPlayAudio = true;
        if (unmounted) return;
        if (cardConfig.isFirstTime || writingMode === WritingMode.External) {
            if (!animationDontGoToNextChar) {
                completedCharCount = (completedCharCount + 1) % characterData!.characters.length;
            }
            animationDontGoToNextChar = false;
            window.setTimeout(() => {
                if (isCurrentCharSupportedByHanziWriter()) {
                    setupHanziWriter(completedCharCount);
                } else {
                    onUnsupportedCharReady();
                }
                // play sound
            }, delayOverride ?? NEXT_CHAR_DELAY);
        } else {
            if (app.getConfig(deckId).playSuccessSound) correctSound.play();
            completedCharCount = completedCharCount + 1;
            if (completedCharCount == characterData?.characters.length) {
                // done;
                onComplete({...autoReviewData});
                isComplete = true;
                surpressGradeIndicator = false;
                window.setTimeout(async () => {
                    if (!isDictationMode && audios.length) await playAudio();
                    onReadyToGoNext();
                }, delayOverride ?? NEXT_CHAR_DELAY);
            } else {
                window.setTimeout(() => {
                    if (isCurrentCharSupportedByHanziWriter()) {
                        setupHanziWriter(completedCharCount);
                    } else {
                        onUnsupportedCharReady();
                    }
                    // play sound
                }, delayOverride ?? NEXT_CHAR_DELAY);
            }
        }
    }
    let writer: HanziWriter;
    let activeManualWriter: ManualWriter | null = null;
    let manualWriter = $state<Record<number, ManualWriter>>({});
    let isShowManualResultPreview = $state(false);
    function setupHanziWriter(index: number) {
        if (unmounted) return;
        if (!characterData) return;
        if (writer) {
            if (!cardConfig.isFirstTime) writer.cancelQuiz();
            writer.hideCharacter();
            writer.hideOutline();
        }
        const tone = getChineseTone(characterData.tags[index] ?? []);
        const externalAndDone = writingMode === WritingMode.External && isComplete;
        writer = HanziWriter.create('grid-background-target', characterData.characters[index], {
            width: width,
            height: height,
            padding: 5,
            showCharacter: false, 
            showOutline: cardConfig.isShowOutline || externalAndDone,
            highlightOnComplete: false,
            strokeColor: app.getChineseToneColor(tone) ?? "#555",
            // drawing
            drawingWidth: CHARACTER_WRITER_DRAWING_WIDTH,
            drawingColor: "#555",
            showHintAfterMisses: app.getConfig(deckId).showHintAfterMissesCount,
            strokeFadeDuration: app.getConfig(deckId).strokeFadeDuration,
            // auto stroke animation
            strokeAnimationSpeed: strokeSpeed,
            delayBetweenStrokes: linmap(strokeSpeed, 1, MAX_STROKE_SPEED, 1000, 10),
            delayBetweenLoops: linmap(strokeSpeed, 1, MAX_STROKE_SPEED, 2000, 10),
            onComplete: () => {
                completeChar();
            },
            // load locally
            charDataLoader: (char, onComplete) => {
                isStrokeDataLoaded = false;
                fetchHanziWriterCharData(char)
                    .then(data => onComplete(data));
            },
            onLoadCharDataSuccess: () => {
                isStrokeDataLoaded = true;
                if (activeManualWriter) {
                    window.requestAnimationFrame(() => {
                        activeManualWriter?.putLayerOnTop();
                    });
                }
            }
        });
        if (!cardConfig.isFirstTime && !externalAndDone) {
            if (writingMode === WritingMode.Manual) {
                setupManualWriter(index);
            } else {
                writer.quiz({
                    leniency: app.getConfig(deckId).strokeLeniency,
                    onMistake: () => { 
                        autoReviewData.incorrectStrokeCount++; 
                        autoReviewData.totalStrokeCount++;
                    },
                    onCorrectStroke: () => { 
                        autoReviewData.correctStrokeCount++; 
                        autoReviewData.totalStrokeCount++;
                    },
                });
            }
            const showOutlineBecauseRevealed = autoReviewData.revealedCharIndex && autoReviewData.revealedCharIndex.includes(index);
            const showOUtlineBecaueFailWholeWord = isFailWholeWord && autoReviewData.revealedCharIndex && autoReviewData.revealedCharIndex.length > 0;
            if (showOutlineBecauseRevealed || showOUtlineBecaueFailWholeWord) {
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
    
    function setupManualWriter(index: number) {
        if (!characterData) return;
        isStrokeDataLoaded = true;
        
        if (activeManualWriter) {
            activeManualWriter.cancelQuiz();
            activeManualWriter.hideCharacter();
            activeManualWriter.hideOutline();
        }
        const tone = getChineseTone(characterData.tags[index] ?? []);
        manualWriter[index] = ManualWriter.create('grid-background-target', characterData.characters[index], {
            width,
            height,
            drawingWidth: CHARACTER_WRITER_DRAWING_WIDTH,
            drawingColor: app.getChineseToneColor(tone) ?? "#555",
            strokeAnimationSpeed: strokeSpeed,
            delayBetweenStrokes: linmap(strokeSpeed, 1, MAX_STROKE_SPEED, 1000, 10),
            delayBetweenLoops: linmap(strokeSpeed, 1, MAX_STROKE_SPEED, 2000, 10),
            onNext: () => {
                const isLastChar = index === characterData!.characters.length - 1;
                if (!isLastChar) {
                    completeChar(0);
                    // setupManualWriter(index + 1);
                } else {
                    activeManualWriter?.cancelQuiz();
                    activeManualWriter?.hideCharacter();
                    activeManualWriter?.hideOutline();
                    completeChar(0);
                    // onComplete({...autoReviewData});
                    // isComplete = true;
                    // surpressGradeIndicator = false;
                    isShowManualResultPreview = true;
                }
            }
        })
        activeManualWriter = manualWriter[index];
        activeManualWriter.quiz();
    }
    
    async function setupAudios() {
        const urls = characterData?.audioUrl;
        isAudioArtificial = urls?.length === 1 && urls[0][0].startsWith(WENBUN_TTS_URL);
        if (!urls) return;
        
        const flatUrls = urls.flat();
        Promise.all(flatUrls.map(async (u) => {
            const url = await getAudioUrl(cardConfig.lang, u);
            return waitForAudioLoaded(url);
        })).then(() => {
            const shouldPlayAudioAfterLoad = isAudioButtonPressed;
            isAudioLoaded = true;
            isAudioButtonPressed = false;
            if (shouldPlayAudioAfterLoad) {
                void playAudio();
            }
        });
        
        audios = await Promise.all(urls.map(async (rawUs) => {
            const us = await Promise.all(rawUs.map(u => getAudioUrl(cardConfig.lang, u)));
            if (us.length > 1) {
                return new AudioSequence(us, {
                    defaultEndEarlyMs: 320,
                    defaultOffsetMs: 300,
                });
            } else {
                return new AudioSequence(us);
            }
        }));
    }
    
    async function waitForAudioLoaded(url: string) {
        return new Promise((resolve) => {
            const audio = new Audio(url);
            audio.oncanplaythrough = () => {
                resolve(audio);
            }
        });
    }

    export function stopAllAudio() {
        // Stop any playing audio sequences
        audios.forEach(a => a.stop());
    }

    async function playAudio() {
        if (unmounted) return;
        // Stop any currently playing audio first
        stopAllAudio();
        // random index
        const index = Math.floor(Math.random() * audios.length);
        const a = audios[index];
        if (!a) return;
        await a.playAsync();
    }

    async function tryPlayAudio() {
        if (!isAudioLoaded) {
            isAudioButtonPressed = true;
            return;
        }
        await playAudio();
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
        if (autoReviewData.revealedCharIndex == undefined) autoReviewData.revealedCharIndex = [];
        autoReviewData.revealedCharIndex.push(completedCharCount);
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
        
        writer.pauseAnimation();
        writer._assignOptions({
            strokeAnimationSpeed: strokeSpeed,
            delayBetweenStrokes: linmap(strokeSpeed, 1, MAX_STROKE_SPEED, 1000, 10),
            delayBetweenLoops: linmap(strokeSpeed, 1, MAX_STROKE_SPEED, 2000, 10),
        })
        animationDontGoToNextChar = true;
        writer.animateCharacter();
    }
    
    
    let healthBarAgainLimit = $state(0);
    let healthBarHardLimit = $state(0);
    async function setupHealthBarCssVar() {
        if (!isShowHealthBar) return;
        let total = 0;
        for (const char of characterData?.characters ?? "") {
            try {
                const charData = await HanziWriter.loadCharacterData(char, {
                    charDataLoader: (char, onComplete, onError) => {
                        fetchHanziWriterCharData(char)
                            .then((data) => onComplete(data))
                            .catch((e) => onError?.(e));
                    }
                });
                if (charData) total += charData.strokes.length;
            } catch(e) {
                console.warn(`Failed to load stroke data for character ${char}:`, e);
            }
        }
        const {hard, again} = AutoReview.getGradeMistakeCountLimits(total);
        healthBarAgainLimit = again;
        healthBarHardLimit = hard;
    }
    
    function onExternalWritingModeComplete() {
        onComplete({...autoReviewData});
        isComplete = true;
        surpressGradeIndicator = false;
        setupHanziWriter(0)
    }
    
    
    function experimentalApplePencilFix() {
        if (TRUE) return; // deprecated
        // keep the functionality, just in case
        
        if (!app.getConfig(deckId)._experimentalFixApplePencil) return;
    
        const writerEl = document.getElementById('grid-background-target');
        if (!writerEl) return;
    
        let lastPointer = Date.now();
        const updatePointerTime = () => (lastPointer = Date.now());
        const touchEvents = ['pointerdown', 'touchstart'];
    
        // --- attach listeners ---
        touchEvents.forEach(evt =>
            writerEl.addEventListener(evt, updatePointerTime, { passive: true })
        );
    
        // --- CSS hardening ---
        Object.assign(writerEl.style, {
            touchAction: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
        });
    
        // --- touch revive loop ---
        let frameId: number;
        const reviveTouch = () => {
            const now = Date.now();
            if (now - lastPointer > 3000) {
                writerEl.style.pointerEvents = 'none';
                requestAnimationFrame(() => {
                    // trigger layout reflow
                    void writerEl.offsetHeight;
                    writerEl.style.pointerEvents = 'auto';
                });
                lastPointer = now;
            }
            frameId = requestAnimationFrame(reviveTouch);
        };
        frameId = requestAnimationFrame(reviveTouch);
    
        // --- optional extra guard for Safari's ghost touchcancel ---
        const touchCancelHandler = () => {
            writerEl.style.pointerEvents = 'none';
            setTimeout(() => (writerEl.style.pointerEvents = 'auto'), 50);
        };
        window.addEventListener('touchcancel', touchCancelHandler);
    
        // --- return cleanup function ---
        return () => {
            touchEvents.forEach(evt =>
                writerEl.removeEventListener(evt, updatePointerTime)
            );
            window.removeEventListener('touchcancel', touchCancelHandler);
            if (frameId) cancelAnimationFrame(frameId);
            // restore pointer events if it was disabled mid-loop
            writerEl.style.pointerEvents = 'auto';
        };
    }
    
    onMount(() => {
        manualWriter = {};
        autoReviewData = {
            correctStrokeCount: 0,
            incorrectStrokeCount: 0,
            totalStrokeCount: 0,
            revealedCharIndex: [],
        };
        if (isShowHealthBar) {
            void setupHealthBarCssVar();
        }
        updateWidth();
        setupAudios().then(() => {
            if (isDictationMode) {
                playAudio();
            }
        });
        window.addEventListener('resize', updateWidth);
        strokeSpeed = app.getStrokeSpeed();

        if (isCurrentCharSupportedByHanziWriter()) {
            setupHanziWriter(0);
        } else {
            onUnsupportedCharReady();
        }

        const cleanupApplePencilFix = experimentalApplePencilFix();
        return () => {
            clearUnsupportedFirstTimeTimeout();
            unmounted = true;
            for (const writer of Object.values(manualWriter)) {
                writer.destroy();
            }
            activeManualWriter = null;
            window.removeEventListener('resize', updateWidth);
            if (cleanupApplePencilFix) cleanupApplePencilFix();
        };
    });
    
    // const isShowReading = $derived(() => {
    //     if (app.getConfig().zh.alwaysShowReading) return true;
    //     if (isShowReadingOnFail && autoReviewData?.isFailAndReveal) return true;
    //     if (isComplete) return true;
    //     if (cardConfig.isFirstTime) return true;
    //     if (isDictationMode) return true;
    //     return false;
    // });
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
    }
    .is-hidden {
        visibility: hidden;
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
        position: relative;
        background-color: #FFFFFF90;
        border-radius: 0.5em;
        touch-action: none;
    }
    .manual-result-overlay {
        position: absolute;
        inset: 0;
        z-index: 3;
        background: #E0E0E0;
        border-radius: 0.5em;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.4em;
        overflow: hidden;
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
        &.long-text {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
        }
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
        &.long-text {
            flex: 0 1 auto;
        }
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
        z-index: 100;
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
    .stroke-data-loading-indicator {
        position: absolute;
        top: 1em;
        right: 1em;
        opacity: 0;
        animation: appear 0.1s ease-out 0.2s forwards;
    }
    @keyframes appear {
        to { opacity: 1; }
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
    @keyframes unsupported-char-first-time-fade {
        0% { opacity: 0; }
        15% { opacity: 1; }
        85% { opacity: 1; }
        100% { opacity: 0; }
    }
    
    .reveal-button {
        all: unset;
        cursor: pointer;
        color: transparent;
        padding: 0 2em;
        &:hover {
            color: unset;
            transition: 0.2s;
        }
    }
    
    .external-writing-mode-div {
        position: absolute;
        width: 100%;
        height: 85%;
        display: flex;
        justify-content: center;
        align-items: center;
        .panel {
            display: flex;
            align-items: center;
            padding: 2em;
            margin: 2em;
            background-color: #00000000;
            border-radius: 0.5rem;
            flex-direction: column;
            gap: 1em;
            justify-content: center;
            .instruction {
                text-align: center;
            }
            .button {
                width: fit-content;
                padding: 2em 4em;
            }
        }
    }
    
    .loading-icon {
        opacity: 0.5;
    }
</style>

<div class="character-writer">
    <div class="meaning">
        {#if isDictationMode && !isDictationModeRevealMeaning && !isComplete && !cardConfig.isFirstTime}
            <button class="reveal-button" onclick={() => isDictationModeRevealMeaning = true} aria-label="Reveal Meaning">
                <i class="fa-solid fa-eye"></i>
            </button>
        {:else}
            <div>{meaningStr}</div>
        {/if}

    </div>
    <div class="reading-container">
        <div class="reading">
            {#if !isRevealReading && !app.getConfig(deckId).zh.alwaysShowReading && !isComplete && !cardConfig.isFirstTime}
                <button class="reveal-button" onclick={() => isRevealReading = true} aria-label="Reveal Reading">
                    <i class="fa-solid fa-eye"></i>
                </button>
            {:else}
                {characterData?.reading}
            {/if}
        </div>
        {#if audios.length > 0}
            {#if !isAudioLoaded && !isDisableLoadingIndicator && (!isDontShowAudioLoadingIfNotPlaying || isAudioButtonPressed)}
                <button class="audio-button" onclick={() => {}} aria-label="Loading Audio">
                    <i class="fa-solid fa-circle-notch fa-spin loading-icon"></i>
                </button>
            {:else}
                <button class="audio-button" onclick={() => tryPlayAudio()} aria-label="Play Audio">
                    <i class="fa-solid fa-volume-low"></i>
                </button>
            {/if}
            <!-- {#if isAudioArtificial}
                <i class="fa-solid fa-robot"></i>
            {/if} -->
        {/if}
    </div>
    <div class="character-container">
        <div class="grid-background">
                {#if autoReviewData && isShowHealthBar}
                    <div class="auto-grade-health-bar"
                        style={`--mistake-count: ${autoReviewData.incorrectStrokeCount}; --limit-hard: ${healthBarHardLimit}; --limit-again: ${healthBarAgainLimit}`}
                    ></div>
                {/if}
                {#if writingMode === WritingMode.External && !isComplete && !cardConfig.isFirstTime}
                    <div class="external-writing-mode-div">
                        <div class="panel">
                            <div class="instruction">
                                Write on paper or elsewhere outside the app.
                            </div>
                            <button class="button" onclick={() => onExternalWritingModeComplete()}>
                                Done
                            </button>
                        </div>
                    </div>
                {/if}
            <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} id="grid-background-target">
            <line x1={p} y1={p} x2={width - p} y2={height - p} stroke={gridStroke} />
            <line x1={width - p} y1={p} x2={p} y2={height - p} stroke={gridStroke} />
            <line x1={width/2} y1={p} x2={width/2} y2={height - p} stroke={gridStroke} />
            <line x1={p} y1={height/2} x2={width - p} y2={height/2} stroke={gridStroke} />
            </svg>
            {#if !isCurrentCharSupportedByHanziWriter()}
                <button
                    aria-label="Unsupported character interaction"
                    style="position: absolute; inset: 0; border: none; background: transparent; cursor: pointer;"
                    onpointerdown={() => onUnsupportedCharacterInteraction()}
                    onpointermove={(e) => {
                        if (!isUnsupportedCharRevealed && e.buttons > 0) onUnsupportedCharacterInteraction();
                    }}
                ></button>
            {/if}
            {#if !isCurrentCharSupportedByHanziWriter() && isUnsupportedCharRevealed}
                <div style={`position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6em; padding: 1em; text-align: center; pointer-events: none; ${cardConfig.isFirstTime ? `animation: unsupported-char-first-time-fade ${UNSUPPORTED_FIRST_TIME_DISPLAY_MS}ms ease-in-out forwards;` : ''}`}>
                    <div class="chinese-font" style="font-size: 8em; line-height: 1;">
                        {characterData?.characters?.[completedCharCount] ?? ''}
                    </div>
                    {#if !cardConfig.isFirstTime}
                        <div style="color: #A64547; font-weight: 700; font-size: 1.1em;">
                            {SLUG_UNSUPPORTED_CHAR_INTERACTION_NEXT}
                        </div>
                        <div style="max-width: 24em; color: #00000080; font-size: 0.9em;">
                            {SLUG_UNSUPPORTED_CHAR_INTERACTION_WARNING}
                        </div>
                    {/if}
                </div>
            {/if}
            {#if writingMode === WritingMode.Manual && isShowManualResultPreview}
                <div class="manual-result-overlay">
                    <ManualWriterResultPreview
                        characterData={characterData}
                        manualWriter={manualWriter}
                        toneColors={app.getChineseToneColorArray()}
                    />
                </div>
            {/if}
        </div>
        <div class="bottom-container" style:max-width={`${width}px`}>
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
                <div class="right-side" class:long-text={isLongText}>
                    <button class="button dict-button" onclick={() => onOpenDict()}>
                        <i class="fa-solid fa-book"></i>
                        Dict
                    </button>
                    <div class="character-box-container chinese-font" class:long-text={isLongText}>
                        {#each characterData.characters as character, i}
                            {#if i < completedCharCount || cardConfig.isFirstTime || (writingMode === WritingMode.External && isComplete)}
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
        {#if isCurrentCharSupportedByHanziWriter() && !isStrokeDataLoaded && !isDisableLoadingIndicator}
            <div class="stroke-data-loading-indicator">
                <i class="fa-solid fa-circle-notch fa-spin loading-icon"></i>
            </div>
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