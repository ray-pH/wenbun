<script lang="ts">
    import { base } from '$app/paths';
    import { App } from '$lib/app';
    import { getAudioUrl } from '$lib/chinese';
    import TopBar from '$lib/components/TopBar.svelte';
    import { WENBUN_AUDIO_URL, YUE_AUDIO_DICT_SRC, ZH_AUDIO_DICT_SRC } from '$lib/constants';
    import _ from 'lodash';
    import { onMount } from 'svelte';
    
    let app = new App();
    let srcBlacklist: string[] = [];
    let zhDict: Record<string, string[]> = {};
    let init = false;
    // let yueDict: Record<string, string[]> = {};
    
    onMount(async () => {
        processDict();
        await app.init(null);
        initComponent();
        const changed = await app.initProfile(null);
        if (changed) initComponent();
    })
    
    async function processDict() {
        const resZh = await fetch(ZH_AUDIO_DICT_SRC);
        zhDict = groupBySources(await resZh.json());
        // const resYue = await fetch(YUE_AUDIO_DICT_SRC);
        // yueDict = groupBySources(await resYue.json());
    }
    
    function initComponent() {
        srcBlacklist = app.getConfig(null).zh.audioSrcBlacklist;
        init = true;
        app = app;
    }
    
    function groupBySources(dict: Record<string, string[]>): Record<string, string[]> {
        const result: Record<string, string[]> = {};
        for (const val of Object.values(dict)) {
            for (const v of val) {
                const dir = v.split('/').slice(0, -1).join('/');
                if (!result[dir]) result[dir] = [];
                result[dir].push(v);
            }
        }
        return result;
    }
    
    let randomizeI = 0;
    
    const randomN = 5;
    function getRandom(dir: string, dict: Record<string, string[]>, _randomizeI = 0): string[] {
        const shuffled = _.shuffle(dict[dir]);
        return shuffled.slice(0, randomN).toSorted();
    }
    
    async function play(lang: 'zh' | 'yue', url: string) {
        const _url = await getAudioUrl(lang, url);
        const audio = new Audio(_url);
        audio.play();
    }
    async function cacheAudio(lang: 'zh' | 'yue', url: string) {
        return new Promise((resolve) => {
            getAudioUrl(lang, url).then((url) => {
                const audio = new Audio(url);
                audio.oncanplaythrough = () => {
                    resolve(audio);
                }
            });
        });
    }
    
    async function blacklistSrc(src: string) {
        app.blacklistAudioSrc(src);
        await app.save();
        srcBlacklist = app.getConfig(null).zh.audioSrcBlacklist;
    }
    async function unblacklistSrc(src: string) {
        app.unblacklistAudioSrc(src);
        await app.save();
        srcBlacklist = app.getConfig(null).zh.audioSrcBlacklist;
    }
    
</script>

<TopBar title="Audio Settings" isSettings={true}></TopBar>

<div class="main-container">
    {#each Object.keys(zhDict) as dir}
        <div class="source-card" class:blacklisted={srcBlacklist.includes(dir)}>
            <div><span class="label">source:</span> {dir}</div>
            <div><span class="label">count:</span> {Object.keys(zhDict[dir]).length}</div>
            {#if init}
                <div>
                    <span class="label">status:</span>
                    {#if !srcBlacklist.includes(dir)}
                        <span class="status allowed">allowed</span>
                    {:else}
                        <span class="status blacklisted">blacklisted</span>
                    {/if}
                </div>
                <div style="display: flex; gap: 0.5em; margin-top: 0.5em; margin-bottom: 0.5em;">
                    {#if !srcBlacklist.includes(dir)}
                        <button class="button" onclick={() => blacklistSrc(dir)}>blacklist</button>
                    {:else}
                        <button class="button" onclick={() => unblacklistSrc(dir)}>allow</button>
                    {/if}
                    <button class="button" onclick={() => randomizeI++}>randomize</button>
                </div>
                <div>
                    <span class="label">examples:</span>
                </div>
                <div class="audio-button-container">
                    {#each getRandom(dir, zhDict, randomizeI) as url}
                        <button class="audio-button" onclick={() => play('zh', url)}>
                            {url.split('/').slice(-1)[0].split('.')[0]}
                            {#await cacheAudio('zh', url)}
                                <i class="fa-solid fa-circle-notch fa-spin loading-icon"></i>
                            {:then}
                                <i class="fa-solid fa-play"></i>
                            {/await}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {/each}
</div>

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        margin: 1em 0;
        padding-top: 1em;
    }
    
    .source-card {
        width: 90vw;
        max-width: 30em;
        background-color: #FFFFFF90;
        border-radius: 0.5em;
        padding: 1em;
        margin-bottom: 1em;
        &.blacklisted {
            opacity: 0.5;
        }
    }
    
    .audio-button-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5em;
    }
    
    .audio-button {
        all: unset;
        display: block;
        padding: 0.5em 1em;
        background-color: white;
        border-radius: 0.5em;
        &:hover {
            opacity: 0.5;
            cursor: pointer;
        }
    }
    
    .label {
        color: #00000090;
    }
    
    .status {
        font-weight: bold;
        &.allowed {
            color: var(--wenbun-blue);
        }
    }
    
    .loading-icon {
        opacity: 0.5;
    }
</style>