<script lang="ts">
    import ZhDict from "$lib/components/ZhDict.svelte";
    import { App } from "$lib/app";
    import { onMount } from "svelte";
    import { ChineseCharacterWordlist, toneFromPinyin } from "$lib/chinese";
    
    export let data: {char?: string};
    
    let app = new App();
    let wordlist = new ChineseCharacterWordlist();
    onMount(async () => {
        await app.init();
        await wordlist.init('zh', false);
        app = app;
    })
    
    function getDictCharData(char: string) {
        const charData = wordlist.getCharDecompData(char);
        return {
            characters: char,
            tones: [toneFromPinyin(charData?.pinyin?.[0] ?? "")],
            meaning: charData?.definition ?? "",
        }
    }

</script>

<div class="container">
    {#key app}
        <ZhDict
            charData={getDictCharData(data.char ?? "")} 
            wordlist={wordlist}
            toneColors={app.getChineseToneColorArray()}
            zhReading={app.getConfig().zh.mandarinReading}
        ></ZhDict>
    {/key}
</div>

<style>
    .container {
        width: 100%;
    }
</style>