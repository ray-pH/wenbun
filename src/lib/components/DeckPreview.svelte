<script lang="ts">
    import { ChineseCharacterWordlist, type ChineseDict } from "$lib/chinese";
    import { SLUG_NO_DATA_IN_DICT_PREVIEW, SLUG_NO_DATA_IN_HANZI_WRITER } from "$lib/constants";
    import { DEFAULT_CUSTOM_DECK, type CustomDeck } from "$lib/customDeck";
    import { onMount } from "svelte";

    export let deck: CustomDeck = DEFAULT_CUSTOM_DECK;
    export let filterShowIssueOnly = false;
    export let issueCount = 0;
    export let issueIds: number[] = [];
    
    let wordlist = new ChineseCharacterWordlist();
    let doneInit = false;
    onMount(async () => {
        await wordlist.init(deck.lang, deck?.isEnableCustomDictionary);
        checkIssue();
        doneInit = true;
    })
    
    function checkIssue() {
        issueCount = 0;
        const ids: number[] = [];
        deck.words.forEach((word, i) => {
            if (!wordlist.isWordSupportedByHanziWriter(word) || !wordlist.getWordData(word)) {
                ids.push(i);
            }
        });
        issueIds = ids;
        issueCount = ids.length;
    }
</script>

<div class="deck-preview-container">
    {#if deck !== null && doneInit}
        <div class="cards-container">
            {#each deck.words as word}
                {@render card(word, wordlist.getWordData(word))}
            {/each}
        </div>
    {/if}
</div>

{#snippet card(word: string, wordData?: ChineseDict[string])}
    <div class="card" class:is-show-error-only={filterShowIssueOnly && issueCount > 0}>
        <span class="word chinese-font">{word}</span>
        <span class="reading">{wordlist.getReading(word, deck.lang) || '-'}</span>
        <span class="meaning">
            {wordData?.meaning ?? '-'}
        </span>
        {#if !wordlist.isWordSupportedByHanziWriter(word)}
            <span class="word-error not-supported" 
                style="cursor: pointer;"
                title={SLUG_NO_DATA_IN_HANZI_WRITER}
                onclick={() => window.alert(SLUG_NO_DATA_IN_HANZI_WRITER)}
                onkeydown={(e) => { if (e.key === 'Enter') window.alert(SLUG_NO_DATA_IN_HANZI_WRITER) }}
                role="button" tabindex="0"
            >
                <i class="fa-solid fa-triangle-exclamation"></i>
            </span>
        {:else if !wordData}
            <span class="word-error no-dict" 
                style="cursor: pointer;"
                title={SLUG_NO_DATA_IN_DICT_PREVIEW}
                onclick={() => window.alert(SLUG_NO_DATA_IN_DICT_PREVIEW)}
                onkeydown={(e) => { if (e.key === 'Enter') window.alert(SLUG_NO_DATA_IN_DICT_PREVIEW) }}
                role="button" tabindex="0"
            >
                <i class="fa-solid fa-circle-exclamation"></i>
            </span>
        {/if}
    </div>
{/snippet}

<style>
    .deck-preview-container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 0.5em;
    }
    .cards-container {
        width: 100%;
        box-sizing: border-box;
    }
    .card {
        display: grid;
        grid-template-columns: 5em 5em 1fr 2em;
        align-items: center;
        padding: 0.2em 0.5em;
        .word {
            font-size: 1.2em;
        }
        &:nth-child(odd) {
            background-color: #FFFFFF50;
        }
        &:has(.not-supported) {
            background-color: var(--wenbun-red);
        }
        &:has(.no-dict) {
            background-color: #DA8C2250;
        }
    }
    .is-show-error-only {
        &:not(:has(.word-error)) {
            display: none;
        }
    }
</style>