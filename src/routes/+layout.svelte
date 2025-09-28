<script lang="ts">
    import { afterNavigate } from '$app/navigation';
    import Loading from '$lib/components/Loading.svelte';
    import Popup from '$lib/components/Popup.svelte';
    import { navigationHistory } from '$lib/navigation';
    import { isRunningInPWA } from '$lib/util';

    let isPrecaching = false;
    afterNavigate(({ to }) => {
        if (to?.url) {
            navigationHistory.push(to.url.pathname + to.url.search);
        }
    });
    
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "CACHE_START") {
            isPrecaching = true;
        } else if (event.data.type === "CACHE_FINISH") {
            isPrecaching = false;
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
    </div>
</Popup>
