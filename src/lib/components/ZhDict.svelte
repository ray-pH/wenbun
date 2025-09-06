<script lang="ts">
    import { ChineseMandarinReading, stripIDC, tagChineseChars, TONE_PREFIX, toneFromPinyin, type ChineseCharacterWordlist, type IChineseCharDecomposition, type TaggedChunk } from "$lib/chinese";
    import { parseIntOrUndefined, type CharacterWriterData } from "$lib/util";
    import { pinyinToZhuyin } from "pinyin-zhuyin";
    import ZhDict from "$lib/components/ZhDict.svelte";

    interface Props {
        charData: {
            characters: string;
            tones: number[];
            meaning: string;
        }
        wordlist: ChineseCharacterWordlist
        toneColors: string[];
        zhReading: ChineseMandarinReading;
        isOpenChildrenDict?: boolean;
    }
    let { 
        charData, wordlist, toneColors, zhReading,
        isOpenChildrenDict = $bindable()
    }: Props = $props();
    let word = charData.characters ?? "";
    let wordColors = charData.tones.map(tone => toneColors[tone-1]) ?? [];
    let wordData = $derived(wordlist.getWordDecompData(word));
    let isComposite = word.length > 1;
    
    function reading(pinyin: string, zhReading: ChineseMandarinReading): string {
        if (zhReading === ChineseMandarinReading.Zhuyin) {
            return pinyinToZhuyin(pinyin);
        } else {
            return pinyin;
        }
    }
    function getComponentsFromDecomposition(decompStr: string): string[] {
        let str = stripIDC(decompStr);
        // remove full-width question mark '？' (U+FF1F)
        str = str.replace(/\uFF1F/gu, "");
        return str.split('');
    }
    function hasComponents(decompStr: string): boolean {
        return getComponentsFromDecomposition(decompStr).length > 0;
    }
    
    let childrenCharData: Props['charData'] | undefined = $state(undefined);
    let isNestedChildrenDictOpen = $state(false);
    function setChildrenChar(char: string) {
        if (char === word) return;
        const charData = wordlist.getCharDecompData(char);
        childrenCharData = {
            characters: char,
            tones: [toneFromPinyin(charData?.pinyin?.[0] ?? "")],
            meaning: charData?.definition ?? "",
        }
        isOpenChildrenDict = true;
    }
    function removeChildrenChar() {
        childrenCharData = undefined;
        isOpenChildrenDict = false;
    }
    
    function getTone(char: string): number {
        const charData = wordlist.getCharDecompData(char);
        return toneFromPinyin(charData?.pinyin?.[0] ?? "");
    }
    function getToneBasedColor(char: string): string {
        const tone = getTone(char);
        return toneColors[tone-1];
    }
</script>

<div class="dict-container">
    {#if childrenCharData}
        {#if !isNestedChildrenDictOpen}
            <button onclick={() => removeChildrenChar()} class="dict-back-button">
                <i class="fa-solid fa-angle-left"></i>
                {word}
            </button>
        {/if}
        <ZhDict
            charData={childrenCharData} 
            wordlist={wordlist}
            toneColors={toneColors}
            zhReading={zhReading}
            bind:isOpenChildrenDict={isNestedChildrenDictOpen}
        />
    {:else}
        {@render DictMainContent()}
    {/if}
</div>
    
{#snippet DictMainContent()}
    {#if isComposite}
        <div class="row">
            <div class="label">Simplified</div>
            <div class="value chinese-font">
                {@render ColoredString(wordlist.toSimplified(word), wordColors)}
            </div>
        </div>
        <div class="row">
            <div class="label">Traditional</div>
            <div class="value chinese-font">
                {@render ColoredString(wordlist.toTraditional(word), wordColors)}
            </div>
        </div>
        <div class="row">
            <div class="label">Definition</div>
            <div class="value">{charData.meaning ?? ''}</div>
        </div>
        <div class="sep"></div>
        <div style="margin-bottom: 0.5em">
            <b>Components</b> :
        </div>
    {/if}
    {#each wordData as data}
        <div class="char-decomp" style="--tone-color: {toneColors[toneFromPinyin(data.pinyin?.[0] ?? '')-1]}">
            <div class="char-container">
                <div class="char chinese-font">
                    {data.character}
                </div>
                <div class="char-pinyin">
                    {reading(data.pinyin?.[0] ?? '', zhReading)}
                </div>
            </div>
            <div class="char-info">
                <div class="row">
                    <div class="label">Simplified</div>
                    <div class="value chinese-font colored">
                        {@render ClickableChar(wordlist.toSimplified(data.character))}
                    </div>
                </div>
                <div class="row">
                    <div class="label">Traditional</div>
                    <div class="value chinese-font colored">
                        {@render ClickableChar(wordlist.toTraditional(data.character))}
                    </div>
                </div>
                <div class="sep"></div>
                <div class="row">
                    <div class="label">Definition</div>
                    <div class="value">{data.definition ?? ''}</div>
                </div>
                <!-- <div class="row">
                    <div class="label">Radical</div>
                    <div class="value">{@render SimpleExpand(wordlist.getCharDecompData(data.radical))}</div>
                </div>
                <div class="sep"></div> -->
                {#if data.etymology}
                    <div class="sep"></div>
                    <div class="row">
                        <div class="label">Etymology</div>
                        <div class="value">{data.etymology.type}</div>
                    </div>
                    {#if data.etymology.hint && data.etymology.type !== 'pictophonetic'}
                        <div class="row">
                            <div class="label">Hint</div>
                            <div class="value">
                                {@render TaggedChunkSpans(tagChineseChars(data.etymology.hint))}
                            </div>
                        </div>
                    {/if}
                    {#if data.etymology.semantic}
                        <div class="row">
                            <div class="label">Semantic</div>
                            <div class="value">{@render SimpleExpand(wordlist.getCharDecompData(data.etymology.semantic))}</div>
                        </div>
                    {/if}
                    {#if data.etymology.phonetic}
                        <div class="row">
                            <div class="label">Phonetic</div>
                            <div class="value">{@render SimpleExpand(wordlist.getCharDecompData(data.etymology.phonetic))}</div>
                        </div>
                    {/if}
                {/if}
                {#if hasComponents(data.decomposition)}
                    <div class="sep"></div>
                    <div class="row">
                        <div class="label">Components</div>
                        <div class="value">
                            {#each getComponentsFromDecomposition(data.decomposition) as char}
                                {@render SimpleExpand(wordlist.getCharDecompData(char))}
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/each}
{/snippet}

{#snippet SimpleExpand(decomp?: IChineseCharDecomposition)}
    {#if decomp}
        <div class="simple-decomp" style="--tone-color: {toneColors[toneFromPinyin(decomp.pinyin?.[0] ?? '')-1]}">
            <button onclick={() => setChildrenChar(decomp.character)} class="simple-char-button">
                <span class="simple-char chinese-font">{decomp.character}</span>
                <span class="simple-pinyin">{reading(decomp.pinyin?.[0] ?? '', zhReading)}</span>
            </button>
            <span class="simple-sep">&mdash;</span>
            <span class="simple-def">{decomp.definition ?? ''}</span>
        </div>
    {/if}
{/snippet}

{#snippet ColoredString(string: string, colors: string[])}
    {#each string as char, i}
        <span style="color: {colors[i]}">
            {@render ClickableChar(char)}
        </span>
    {/each}
{/snippet}

{#snippet TaggedChunkSpans(chunks: TaggedChunk[])}
    {#each chunks as c}
        {#if c.isChineseChar}
            <span style="color: {getToneBasedColor(c.text)}" class="chinese-font">
                {@render ClickableChar(c.text)}
            </span>
        {:else}
            <span>{c.text}</span>
        {/if}
    {/each}
{/snippet}

{#snippet ClickableChar(char: string)}
    <button onclick={() => setChildrenChar(char)} class="simple-char-button">{char}</button>
{/snippet}

<style>
    .char-decomp {
        display: flex;
        flex-direction: row;
        gap: 1em;
        margin-bottom: 2em;
    }
    .char-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: #E0E0E0;
        border-radius: 0.5rem;
        padding: 0.2em;
        min-width: 4em;
    }
    .char {
        font-size: 2em !important;
    }
    .char-info {
        flex-grow: 1;
    }
    .row {
        display: flex;
        .label {
            color: gray;
            margin-right: 0.5em;
            font-size: 0.8em;
            min-width: 7em;
        }
    }
    .sep {
        width: 100%;
        height: 1px;
        background-color: gray;
        margin: 0.5em 0;
    }
    .chinese-font {
        font-size: 1.1em;
    }
    .colored {
        color: var(--tone-color);
    }
    .simple-decomp {
        .simple-char {
            color: var(--tone-color);
        }
        .simple-pinyin {
            color: var(--tone-color);
        }
        .simple-sep {
            color: gray;
        }
    }
    
    .simple-char-button {
        all: unset;
        cursor: pointer;
        &:hover {
            opacity: 0.5;
        }
    }
    .dict-back-button {
        all: unset;
        margin-bottom: 0.5em;
        background-color: #E0E0E0;
        border-radius: 0.5rem;
        cursor: pointer;
        padding: 0.2em 0.5em;
        &:hover {
            opacity: 0.5;
        }
    }
    
</style>