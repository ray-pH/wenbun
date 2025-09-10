<script lang="ts">
    import { base } from "$app/paths";
    import { ChineseCharacterWordlist } from "$lib/chinese";
    import TopBar from "$lib/components/TopBar.svelte";
    import { MainDeckInfo } from "$lib/constants";
    import { loadDeck } from "$lib/util";
    import { onMount } from "svelte";
    
    type DeckWords = {id: string, words: string[]};
    
    let decks: DeckWords[]= [];
    let zhWordlist = new ChineseCharacterWordlist();
    let dictionaryCheckResult: {
        id: string;
        totalWordCount: number;
        totalWordsWithDictData: number;
        totalWordsSupportedByHanziWriter: number;
        missingWords: string[];
        missingWordsFromHanziWriter: string[];
    }[] = []
    
    onMount(async() => {
        await zhWordlist.init('zh', true);
        await Promise.all(
            MainDeckInfo.map(async d => {
                const words = await loadDeck(d.src);
                if (words) decks.push({id: d.id, words});
            })
        );
        decks = decks.sort((a, b) => a.id.localeCompare(b.id));
        checkDictionaryHealth(decks);
    });
    
    function checkDictionaryHealth(deck: DeckWords[]) {
        for (const d of deck) {
            const missingWords = getMissingWordsFromDict(d.words);
            const totalWordCount = d.words.length;
            const totalWordsWithDictData = totalWordCount - missingWords.length;
            const missingWordsFromHanziWriter = getMissingWordsFromHanziWriter(missingWords);
            const totalWordsSupportedByHanziWriter =  totalWordsWithDictData - missingWordsFromHanziWriter.length;
            dictionaryCheckResult.push({
                id: d.id, 
                totalWordCount, 
                totalWordsWithDictData, 
                totalWordsSupportedByHanziWriter,
                missingWords,
                missingWordsFromHanziWriter
            });
            dictionaryCheckResult = dictionaryCheckResult;
        }
    }
    
    function take<T>(arr: T[], n: number): T[] {
        return arr.slice(0, n);
    }
    function getMissingWordsFromDict(words: string[]): string[] {
        return words.filter(w => !isWordExist(w));
    }
    function getMissingWordsFromHanziWriter(words: string[]): string[] {
        return words.filter(w => !zhWordlist.isWordSupportedByHanziWriter(w));
    }
    function isWordExist(word: string): boolean {
        return !!zhWordlist.dict[word] || !!zhWordlist.dict[zhWordlist.toSimplified(word)];
    }
</script>

<TopBar title="Health Check"></TopBar>
<div class="container">
    Word existence in the dictionary check
    {#each dictionaryCheckResult as d}
        <div class:is-healthy={d.totalWordsWithDictData === d.totalWordCount}>
            {d.id}: {d.totalWordsWithDictData}/{d.totalWordCount} 
            {#if d.missingWords.length > 0}
                [missing words: {take(d.missingWords, 5).join(', ')}, ...]
            {/if}
        </div>
    {/each}
    
    <br><br>
    Word support by HanziWriter check
    {#each dictionaryCheckResult as d}
        <div class:is-healthy={d.totalWordsSupportedByHanziWriter === d.totalWordsWithDictData}>
            {d.id}: {d.totalWordsSupportedByHanziWriter}/{d.totalWordsWithDictData} 
            {#if d.missingWordsFromHanziWriter.length > 0}
                [missing words: {take(d.missingWordsFromHanziWriter, 5).join(', ')}, ...]
            {/if}
        </div>
    {/each}
</div>

<style>
    .container {
        width: fit-content;
        margin: auto
    }
    .is-healthy {
        color: green;
    }
</style>
