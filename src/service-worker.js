import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import JSZip from "jszip";
const base = (import.meta.env.BASE_URL ?? "/").slice(0, -1);

precacheAndRoute(self.__WB_MANIFEST ?? []);

self.skipWaiting();
clientsClaim();

async function getManifestFiles() {
    const resp = await fetch(`${base}/wenbun-assets/manifest.txt`);
    const text = await resp.text();

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    const files = lines.map((line) => {
        const [, file] = line.split(/\s+/);
        const clean = file.startsWith("./") ? file.slice(2) : file;
        return `${base}/wenbun-assets/${clean}`;
    });

    return { text, files };
}

async function cacheHanziData(cache) {
    // 1. Fetch zip
    const resp = await fetch(`${base}/wenbun-assets/hanzi-writer-data.zip`);
    const blob = await resp.blob();

    // 2. Load zip
    const zip = await JSZip.loadAsync(blob);

    // 3. Get all .json files
    const files = Object.keys(zip.files).filter(f => f.endsWith(".json"));

    const batchSize = 500; // adjust as needed
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        // process a batch in parallel
        const results = await Promise.allSettled(
            batch.map(async filename => {
                const text = await zip.file(filename).async("text");
                const response = new Response(text, {
                    headers: { "Content-Type": "application/json" }
                });
                const url = `${base}/wenbun-assets/hanzi-writer-data/${filename}`;
                await cache.put(url, response);
            })
        );

        const successCount = results.filter(r => r.status === "fulfilled").length;
        console.log(`[SW] cached ${i + successCount} / ${files.length} files`);
    }

    console.log("[SW] finished caching hanzi data:", files.length, "files");
    await cache.put(`${base}/wenbun-assets/hanzi-writer-data/done`, new Response(`${files.length}`));
}

async function hashString(str) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isCacheComplete(cache, files) {
    const results = await Promise.all(
        files.map(f => cache.match(f))
    );
    return results.every(r => r !== undefined)  &&
        await cache.match(`${base}/wenbun-assets/hanzi-writer-data/done`);
}

async function tryCacheFiles(force = false) {
    const { text, files } = await getManifestFiles();
    const manifestHash = await hashString(text);
    const CACHE_NAME = "wenbun-cache-" + manifestHash.slice(0, 16);
    const cache = await caches.open(CACHE_NAME);
    
    // don't cache if the manifest has not changed
    // check if cache with key CACHE_NAME exists
    if (!force && (await caches.has(CACHE_NAME)) && (await isCacheComplete(cache, files))) {
        console.log("[SW] cache exists, done");
        return;
    }

    broadcast({ type: "CACHE_START" });
    await cache.addAll(files);
    await cacheHanziData(cache);

    console.log("[SW] cached", files.length, "files into", CACHE_NAME);
    broadcast({ type: "CACHE_FINISH" });
    cleanupCaches(CACHE_NAME);
}

function broadcast(msg) {
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
        .then(clients => {
            for (const client of clients) client.postMessage(msg);
        });
}

// Only precache when app is actually installed
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "PRECACHE_ASSETS") {
        event.waitUntil(tryCacheFiles(event.data.force));
    }
});

async function cleanupCaches(currentCacheName) {
    const keys = await caches.keys();
    for (const key of keys) {
        if (key.startsWith("wenbun-cache-") && key !== currentCacheName) {
            await caches.delete(key);
            console.log("[SW] deleted old cache", key);
        }
    }
}

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches
            .match(event.request)
            .then((cached) => cached || fetch(event.request)),
    );
});
