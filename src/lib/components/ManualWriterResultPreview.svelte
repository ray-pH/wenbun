<script lang="ts">
    import { onMount, tick } from 'svelte';
    import HanziWriter from 'hanzi-writer';
    import { TONE_PREFIX } from '$lib/chinese';
    import { parseIntOrUndefined, type CharacterWriterData } from '$lib/util';
    import { CHARACTER_WRITER_DRAWING_WIDTH, HANZI_WRITER_DATA_DIR_SRC } from '$lib/constants';
    import ManualWriter from '$lib/manualWriter';

    interface Props {
        characterData: CharacterWriterData | undefined;
        manualWriter: Record<number, ManualWriter>;
        toneColors?: string[];
    }

    let {
        characterData,
        manualWriter = {},
        toneColors = [],
    }: Props = $props();

    const uid = `manual-result-preview-${Math.random().toString(36).slice(2, 10)}`;
    const GRID_GAP = 8;
    const MIN_CELL_SIZE = 72;
    const MAX_CELL_SIZE = 180;

    const characters = $derived((characterData?.characters ?? '').split(''));

    let viewportWidth = $state(0);

    const cellSize = $derived(
        Math.max(
            MIN_CELL_SIZE,
            Math.min(
                MAX_CELL_SIZE,
                Math.floor((Math.max(240, viewportWidth) - (GRID_GAP * 2)) / 3),
            ),
        ),
    );

    const previewStrokeWidth = $derived(
        Math.max(2, Math.round((CHARACTER_WRITER_DRAWING_WIDTH * cellSize) / 500)),
    );

    let manualPreviewWriters: ManualWriter[] = [];
    let hanziPreviewWriters: HanziWriter[] = [];

    function getChineseTone(tags: string[]): number | undefined {
        for (const tag of tags) {
            if (tag.startsWith(TONE_PREFIX)) {
                return parseIntOrUndefined(tag.substring(TONE_PREFIX.length));
            }
        }
    }

    function getCharacterToneColor(index: number): string {
        const tone = getChineseTone(characterData?.tags[index] ?? []);
        if (!tone) return '#555';
        return toneColors[tone - 1] || '#555';
    }

    function getManualTargetId(index: number): string {
        return `${uid}-manual-${index}`;
    }

    function getHanziTargetId(index: number): string {
        return `${uid}-hanzi-${index}`;
    }

    function stopPreviewAnimations(index?: number) {
        if (index === undefined) {
            for (const writer of manualPreviewWriters) writer.pauseAnimation();
            for (const writer of hanziPreviewWriters) writer.pauseAnimation();
            return;
        }

        manualPreviewWriters[index]?.pauseAnimation();
        hanziPreviewWriters[index]?.pauseAnimation();
    }

    function destroyPreviewWriters() {
        stopPreviewAnimations();

        for (const writer of manualPreviewWriters) {
            writer.destroy();
        }
        manualPreviewWriters = [];

        for (const writer of hanziPreviewWriters) {
            writer.cancelQuiz();
            writer.hideCharacter();
            writer.hideOutline();
        }
        hanziPreviewWriters = [];
    }

    async function setupPreviewWriters() {
        destroyPreviewWriters();

        for (let i = 0; i < characters.length; i++) {
            const char = characters[i] ?? '';
            const color = getCharacterToneColor(i);
            const previewWriter = ManualWriter.create(getManualTargetId(i), char, {
                width: cellSize,
                height: cellSize,
                showCharacter: false,
                showOutline: false,
                showControls: false,
                drawingWidth: previewStrokeWidth,
                drawingColor: color,
                strokeAnimationSpeed: 2,
                delayBetweenStrokes: 200,
                delayBetweenLoops: 500,
            });

            const sourceWriter = manualWriter[i];
            if (sourceWriter) {
                previewWriter.setUserStrokes(sourceWriter.getUserStrokes());
            }

            manualPreviewWriters.push(previewWriter);
        }

        for (let i = 0; i < characters.length; i++) {
            const char = characters[i] ?? '';
            const color = getCharacterToneColor(i);
            const previewWriter = HanziWriter.create(getHanziTargetId(i), char, {
                width: cellSize,
                height: cellSize,
                padding: 6,
                showCharacter: false,
                showOutline: false,
                highlightOnComplete: false,
                strokeColor: color,
                drawingColor: color,
                drawingWidth: previewStrokeWidth,
                strokeAnimationSpeed: 2,
                delayBetweenStrokes: 200,
                delayBetweenLoops: 500,
                charDataLoader: (loadedChar, onComplete) => {
                    fetch(HANZI_WRITER_DATA_DIR_SRC + loadedChar + '.json')
                        .then(r => r.json())
                        .then(data => onComplete(data));
                }
            });

            hanziPreviewWriters.push(previewWriter);
        }
    }

    function replayColumn(index: number) {
        const manualPreviewWriter = manualPreviewWriters[index];
        const hanziPreviewWriter = hanziPreviewWriters[index];

        if (!manualPreviewWriter || !hanziPreviewWriter) return;

        stopPreviewAnimations(index);

        manualPreviewWriter.hideCharacter();
        void manualPreviewWriter.animateCharacter({
            onComplete: () => {
                manualPreviewWriter.showCharacter();
            }
        });

        hanziPreviewWriter.hideCharacter();
        hanziPreviewWriter.hideOutline();
        hanziPreviewWriter.animateCharacter();
    }

    function playAllColumns() {
        for (let i = 0; i < characters.length; i++) {
            window.setTimeout(() => {
                replayColumn(i);
            }, i * 80);
        }
    }

    onMount(() => {
        void (async () => {
            await tick();
            await setupPreviewWriters();
            await tick();
            playAllColumns();
        })();

        return () => {
            destroyPreviewWriters();
        };
    });
</script>

<style>
    .manual-result-preview {
        height: 100%;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    .grid-scroll {
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 0.2em;
    }

    .grid-content {
        --cell-size: 120px;
        --col-count: 1;

        display: flex;
        flex-direction: column;
        gap: 0.5em;
        min-width: min-content;
        width: max-content;
        margin-inline: auto;
    }

    .grid-row {
        display: grid;
        grid-template-columns: repeat(var(--col-count), var(--cell-size));
        gap: 0.5em;
    }

    .preview-cell {
        all: unset;
        width: var(--cell-size);
        height: var(--cell-size);
        background: #FFFFFFDD;
        border: 1px solid #00000018;
        border-radius: 0.5em;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .preview-cell:hover {
        border-color: #00000035;
        background: #FFFFFF;
    }

    .preview-svg {
        width: 100%;
        height: 100%;
    }

    .hanzi-target {
        width: 100%;
        height: 100%;
    }
</style>

<div class="manual-result-preview" bind:clientWidth={viewportWidth}>
    <div class="grid-scroll">
        <div
            class="grid-content"
            style={`--cell-size: ${cellSize}px; --col-count: ${Math.max(1, characters.length)};`}
        >
            <div class="grid-row">
                {#each characters as character, i}
                    <button
                        class="preview-cell"
                        onclick={() => replayColumn(i)}
                        aria-label={`Replay column ${i + 1} (${character})`}
                    >
                        <svg
                            class="preview-svg"
                            id={getManualTargetId(i)}
                            xmlns="http://www.w3.org/2000/svg"
                            width={cellSize}
                            height={cellSize}
                        ></svg>
                    </button>
                {/each}
            </div>
            <div class="grid-row">
                {#each characters as character, i}
                    <button
                        class="preview-cell"
                        onclick={() => replayColumn(i)}
                        aria-label={`Replay column ${i + 1} (${character})`}
                    >
                        <div class="hanzi-target" id={getHanziTargetId(i)}></div>
                    </button>
                {/each}
            </div>
        </div>
    </div>
</div>
