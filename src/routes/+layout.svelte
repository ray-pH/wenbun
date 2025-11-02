<script lang="ts">
    import { afterNavigate, goto } from '$app/navigation';
    import { base } from '$app/paths';
    import Loading from '$lib/components/Loading.svelte';
    import Popup from '$lib/components/Popup.svelte';
    import { navigationHistory } from '$lib/navigation';
    import { humanReadableByte, isRunningInPWA } from '$lib/util';
    import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
    
    function handleDeepLink(url: string) {
        if (!url.startsWith('wenbun://')) return;
        const stripped = url.replace('wenbun://', '');
        goto(base + '/' + stripped);
    }
    getCurrent().then((startUrls) => {
        if (startUrls) {
            // console.log('startUrls', startUrls)
            for (const url of startUrls) {
                handleDeepLink(url);
            }
        }
    });
    onOpenUrl((urls) => {
        // console.log('onOpenUrl', urls)
        for (const url of urls) {
            handleDeepLink(url);
        }
    })

    let isPrecaching = false;
    let initialStorageUse = 0; 
    let currentStorageUse = 0;
    afterNavigate(({ to }) => {
        if (to?.url) {
            navigationHistory.push(to.url.pathname + to.url.search);
        }
    });
    
    let timeout: number | undefined = undefined;
    function loopUpdateCurrentStorageUse() {
        navigator.storage.estimate().then((storage) => {
            currentStorageUse = storage.usage ?? 0;
        });
        timeout = window.setTimeout(() => {
            loopUpdateCurrentStorageUse();
        }, 100);
    }
    
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "CACHE_START") {
            isPrecaching = true;
            navigator.storage.estimate().then((storage) => initialStorageUse = storage.usage ?? 0);
            loopUpdateCurrentStorageUse();
        } else if (event.data.type === "CACHE_FINISH") {
            isPrecaching = false;
            if (timeout) {
                window.clearTimeout(timeout);
                timeout = undefined;
            }
        }
    });
    
    function tryPreCacheAssets() {
        if (isPrecaching) return;
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "PRECACHE_ASSETS" });
        }
    }
    
    window.addEventListener("appinstalled", () => {
        console.log("[App] PWA installed, requesting asset precache…");
        tryPreCacheAssets();
    });
    
    if (isRunningInPWA()) {
        tryPreCacheAssets();
    }
</script>

<slot />
<Popup isOpen={isPrecaching} onClose={() => {}}>
    <div style="width: 100%; display: flex; align-items: center; flex-direction: column; gap: 1em; padding: 2em 0;">
        <div>Downloading/Updating Assets</div>
        <div>For Offline Usage</div>
        <div>Please wait…</div>
        <Loading></Loading>
        <div>Downloaded {humanReadableByte(currentStorageUse - initialStorageUse)}</div>
    </div>
</Popup>
