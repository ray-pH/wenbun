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
        totalWordsSupportedByHanziWriterSimplified: number;
        totalWordsSupportedByHanziWriterTraditional: number;
        missingWords: string[];
        missingWordsFromHanziWriterSimplified: string[];
        missingWordsFromHanziWriterTraditional: string[];
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
        console.log(zhWordlist.isWordSupportedByHanziWriter("湿"));
    });
    
    function checkDictionaryHealth(deck: DeckWords[]) {
        for (const d of deck) {
            const missingWords = getMissingWordsFromDict(d.words);
            const totalWordCount = d.words.length;
            const totalWordsWithDictData = totalWordCount - missingWords.length;
            const wordsWithDictData = d.words.filter(w => isWordExist(w));
            const missingWordsFromHanziWriterSimplified = getMissingWordsFromHanziWriter(wordsWithDictData, 'simplified');
            const missingWordsFromHanziWriterTraditional = getMissingWordsFromHanziWriter(wordsWithDictData, 'traditional');
            const totalWordsSupportedByHanziWriterSimplified = totalWordsWithDictData - missingWordsFromHanziWriterSimplified.length;
            const totalWordsSupportedByHanziWriterTraditional = totalWordsWithDictData - missingWordsFromHanziWriterTraditional.length;
            dictionaryCheckResult.push({
                id: d.id, 
                totalWordCount, 
                totalWordsWithDictData,
                totalWordsSupportedByHanziWriterSimplified,
                totalWordsSupportedByHanziWriterTraditional,
                missingWords,
                missingWordsFromHanziWriterSimplified,
                missingWordsFromHanziWriterTraditional
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
    function getMissingWordsFromHanziWriter(words: string[], script: 'simplified' | 'traditional'): string[] {
        const convertedWords = words.map(w => script === 'traditional' ? zhWordlist.toTraditional(w) : zhWordlist.toSimplified(w)); 
        return convertedWords.filter(w => {
            return !zhWordlist.isWordSupportedByHanziWriter(w);
        });
    }
    function isWordExist(word: string): boolean {
        const simplified = zhWordlist.toSimplified(word);
        const traditional = zhWordlist.toTraditional(word);
        return !!zhWordlist.dict[word] || !!zhWordlist.dict[simplified] || !!zhWordlist.dict[traditional];
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
    Word support by HanziWriter check (simplified/traditional/total)
    {#each dictionaryCheckResult as d}
        <div class:is-healthy={d.totalWordsSupportedByHanziWriterSimplified === d.totalWordsWithDictData && d.totalWordsSupportedByHanziWriterTraditional === d.totalWordsWithDictData}>
            {d.id}: {d.totalWordsSupportedByHanziWriterSimplified}/{d.totalWordsSupportedByHanziWriterTraditional}/{d.totalWordsWithDictData}
            {#if d.missingWordsFromHanziWriterSimplified.length > 0 || d.missingWordsFromHanziWriterTraditional.length > 0}
                [
                {#if d.missingWordsFromHanziWriterSimplified.length > 0}
                    missing simplified: {take(d.missingWordsFromHanziWriterSimplified, 5).join(', ')}
                {/if}
                {#if d.missingWordsFromHanziWriterSimplified.length > 0 && d.missingWordsFromHanziWriterTraditional.length > 0}
                    ;
                {/if}
                {#if d.missingWordsFromHanziWriterTraditional.length > 0}
                    missing traditional: {take(d.missingWordsFromHanziWriterTraditional, 5).join(', ')}
                {/if}
                ]
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
