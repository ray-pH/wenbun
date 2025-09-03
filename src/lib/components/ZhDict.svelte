<script lang="ts">
    import { ChineseMandarinReading, TONE_PREFIX, type ChineseCharacterWordlist, type IChineseCharDecomposition } from "$lib/chinese";
    import { parseIntOrUndefined, type CharacterWriterData } from "$lib/util";
    import { pinyinToZhuyin } from "pinyin-zhuyin";

    interface Props {
        characterData?: CharacterWriterData;
        wordlist: ChineseCharacterWordlist
        toneColors: string[];
        zhReading: ChineseMandarinReading;
    }
    let { characterData, wordlist, toneColors, zhReading }: Props = $props();
    let word = characterData?.characters ?? "";
    let wordColors = characterData?.tags.map(tags => getChineseTone(tags) ?? 5).map(tone => toneColors[tone-1]) ?? [];
    let wordData = $derived(wordlist.getWordDecompData(word));
    let isComposite = word.length > 1;
    
    function reading(pinyin: string, zhReading: ChineseMandarinReading): string {
        if (zhReading === ChineseMandarinReading.Zhuyin) {
            return pinyinToZhuyin(pinyin);
        } else {
            return pinyin;
        }
    }
    function getChineseTone(tags: string[]): number | undefined {
        for (const tag of tags) {
            if (tag.startsWith(TONE_PREFIX)) {
                return parseIntOrUndefined(tag.substring(TONE_PREFIX.length));
            }
        }
    }
</script>

<div class="dict-container">
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
            <div class="value">{characterData?.meanings[0] ?? ''}</div>
        </div>
        <div class="sep"></div>
        <div style="margin-bottom: 0.5em">
            <b>Components</b> :
        </div>
    {/if}
    {#each wordData as data}
        <div class="char-decomp" style="--tone-color: {toneColors[wordlist.toneFromPinyin(data.pinyin?.[0] ?? '')-1]}">
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
                    <div class="value chinese-font colored">{wordlist.toSimplified(data.character)}</div>
                </div>
                <div class="row">
                    <div class="label">Traditional</div>
                    <div class="value chinese-font colored">{wordlist.toTraditional(data.character)}</div>
                </div>
                <div class="sep"></div>
                <div class="row">
                    <div class="label">Definition</div>
                    <div class="value">{data.definition ?? ''}</div>
                </div>
                <div class="sep"></div>
                <div class="row">
                    <div class="label">Radical</div>
                    <div class="value">{@render SimpleExpand(wordlist.getCharDecompData(data.radical))}</div>
                </div>
                <div class="sep"></div>
                {#if data.etymology}
                    <div class="row">
                        <div class="label">Etymology</div>
                        <div class="value">{data.etymology.type}</div>
                    </div>
                    <div class="row">
                        <div class="label">Hint</div>
                        <div class="value">{data.etymology.hint}</div>
                    </div>
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
            </div>
        </div>
    {/each}
</div>

{#snippet SimpleExpand(decomp?: IChineseCharDecomposition)}
    {#if decomp}
        <div class="simple-decomp" style="--tone-color: {toneColors[wordlist.toneFromPinyin(decomp.pinyin?.[0] ?? '')-1]}">
            <span class="simple-char chinese-font">{decomp.character}</span>
            <span class="simple-pinyin">{reading(decomp.pinyin?.[0] ?? '', zhReading)}</span>
            <span class="simple-sep">&mdash;</span>
            <span class="simple-def">{decomp.definition ?? ''}</span>
        </div>
    {/if}
{/snippet}

{#snippet ColoredString(string: string, colors: string[])}
    {#each string as char, i}
        <span style="color: {colors[i]}">{char}</span>
    {/each}
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
    
</style>