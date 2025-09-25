<script lang="ts">
    import { afterNavigate } from '$app/navigation';
    import { navigationHistory } from '$lib/navigation';

    afterNavigate(({ to }) => {
        if (to?.url) {
            navigationHistory.push(to.url.pathname + to.url.search);
        }
    });
    
    window.addEventListener("appinstalled", () => {
        console.log("[App] PWA installed, requesting asset precache…");
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "PRECACHE_ASSETS" });
        }
    });
</script>

<slot />
