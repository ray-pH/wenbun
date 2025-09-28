<script lang="ts">
    import { base } from "$app/paths";
    import Loading from "$lib/components/Loading.svelte";
    import TopBar from "$lib/components/TopBar.svelte";
    import { payloadToArrayBuffer, WebFileManager } from "$lib/fileManager";
    import { humanReadableByte, streamDownload } from "$lib/util";
    import JSZip from "jszip";
    import { onMount } from "svelte";
    
    const AUDIO_ZIP_URL = "https://bucket.wenbun.com/wenbun-audio-mandarin.zip";
    
    let isDone = false;
    let isCoreDataHealthy = false;
    let isAudioDataHealthy = false;
    let fileManager = new WebFileManager();
    let storageUsage = 0;
    
    async function checkHealth(){
        const resp = await fetch(`${base}/wenbun-assets/manifest.txt`);
        const text = await resp.text();
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        const files = lines.map((line) => {
            const [, file] = line.split(/\s+/);
            const clean = file.startsWith("./") ? file.slice(2) : file;
            return `${base}/wenbun-assets/${clean}`;
        });
        const results = await Promise.all(
            files.map(f => caches.match(f))
        );
        
        isCoreDataHealthy = results.every(r => r !== undefined);
        isAudioDataHealthy = await caches.has("wenbun-audio");
        
        const estimate = await navigator.storage.estimate();
        storageUsage = estimate.usage ?? 0;
        
        
        isDone = true;
    }
    
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "CACHE_FINISH") {
            checkHealth();
        }
    });
    
    function redownloadData() {
        if (isCoreDataHealthy) {
            const confirm = window.confirm("Your data seems to be healthy. Are you sure you want to redownload the data?");
            if (!confirm) return;
        }
        navigator.serviceWorker.controller?.postMessage({ type: "PRECACHE_ASSETS", force: true });
    }
    
    let isHandlingAudioZip = false;
    async function handleAudioZip(arrayBuffer: ArrayBuffer) {
        isHandlingAudioZip = true;
        const zip = await JSZip.loadAsync(arrayBuffer);
        const cache = await caches.open("wenbun-audio");
        
        const tasks: Promise<void>[] = [];
        zip.forEach((relativePath, entry) => {
            if (!entry.dir) {
                tasks.push(
                    (async () => {
                        const blob = await entry.async("blob");
                        const key = `cached/wenbun-audio/${relativePath}`;
                        await cache.put(key, new Response(blob));
                    })()
                );
            }
        });
    
        await Promise.all(tasks);
        await checkHealth();
        isHandlingAudioZip = false;
    }
    
    let currentAudioDownload: { cancel: () => void; finished: Promise<void> } | null = null;
    let audioDownloadedSize = 0;
    let audioTotalSize: number | null = null;
    async function downloadAudioZip() {
        if (isAudioDataHealthy) {
            const confirm = window.confirm("Your audio data seems to be healthy. Are you sure you want to redownload the audio data?");
            if (!confirm) return;
        }
        audioDownloadedSize = 0;
        currentAudioDownload = streamDownload({
            url: AUDIO_ZIP_URL,
            callbackTotalSize: (totalSize) => {
                audioTotalSize = totalSize;
            },
            callbackDownloadedSize: (downloadedSize) => {
                audioDownloadedSize = downloadedSize;
            },
            callbackDone: async (buffer) => {
                currentAudioDownload = null;
                await handleAudioZip(buffer);
            }
        })
    }
    async function cancelAudioDownload() {
        if (currentAudioDownload) {
            currentAudioDownload.cancel();
            currentAudioDownload = null;
        }
    }
    
    async function uploadAudioZip() {
        const payload = await fileManager.upload();
        if (payload === null) return;
        if (!(payload.data instanceof Uint8Array)) return;
        const arrayBuffer = payloadToArrayBuffer(payload);
        await handleAudioZip(arrayBuffer);
    }

    onMount(async () => {
        checkHealth();
    });
</script>

<TopBar title="Offline Data"></TopBar>
<div class="container">
    <div>
        Storage Status
        <div>
            <span>used:</span>
            <span>{humanReadableByte(storageUsage)}</span>
        </div>
    </div>
    <div class="sep"></div>
    <div>
        <span>Offline Data Status:</span>
        {#if !isDone}
            <span><Loading/></span>
        {:else}
            <span class:healthy={isCoreDataHealthy} class:unhealthy={!isCoreDataHealthy}>
                {isCoreDataHealthy ? "Available Offline" : "Missing"}
            </span> 
            {#if !isCoreDataHealthy}
                <div class="note">
                    *Please redownload the data again
                </div>
            {/if}
        {/if}
    </div>
    <button class="button" onclick={() => redownloadData()}>
        <i class="fa-solid fa-download"></i>&nbsp;
        Redownload Core Data
    </button>
    <button class="button" disabled>
        <i class="fa-solid fa-upload"></i>&nbsp;
        Upload Core Data zip file
    </button>
    <div>
        <span>Audio Data Status:</span>
        {#if !isDone || isHandlingAudioZip}
            <span><Loading/></span>
        {:else}
            <span class:healthy={isAudioDataHealthy} class:unhealthy={!isAudioDataHealthy}>
                {isAudioDataHealthy ? "Healthy" : "Unhealthy"}
            </span> 
            {#if currentAudioDownload}
                <div>
                    <span>Downloading</span>
                    <span>{humanReadableByte(audioDownloadedSize)}</span>
                    {#if audioTotalSize !== null}
                        <span>/</span>
                        <span>{humanReadableByte(audioTotalSize)}</span>
                    {/if}
                </div> 
            {:else if !isAudioDataHealthy}
                <div class="note">
                    *Please redownload the data again
                </div>
            {/if}
        {/if}
    </div>
    <div style="display: flex; gap: 0.5em;">
        <button class="button" onclick={() => downloadAudioZip()}>
            <i class="fa-solid fa-download"></i>&nbsp;
            Download Audio Data
        </button>
        {#if currentAudioDownload}
            <button class="button" onclick={() => cancelAudioDownload()}>
                Cancel
            </button>
        {/if}
    </div>
    <button class="button" onclick={() => uploadAudioZip()}>
        <i class="fa-solid fa-upload"></i>&nbsp;
        Upload Audio Data zip file
    </button>
</div>

<style>
    .container {
        margin: auto;
        margin-top: 3em;
        display: flex;
        flex-direction: column;
        align-items: start;
        width: fit-content;
        box-sizing: border-box;
        padding: 1em;
        max-width: 34em;
        min-width: 20em;
        gap: 1em;
    }
    .healthy {
        color: var(--wenbun-green);
    }
    .unhealthy {
        color: var(--wenbun-red);
    }
    .note {
        color: #00000090;
    }
</style>
