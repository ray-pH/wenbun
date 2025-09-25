import { clientsClaim } from "workbox-core";
import JSZip from "jszip";

self.skipWaiting();
clientsClaim();

async function getManifestFiles() {
    const resp = await fetch("/wenbun-assets/manifest.txt");
    const text = await resp.text();

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    const files = lines.map((line) => {
        const [, file] = line.split(/\s+/);
        const clean = file.startsWith("./") ? file.slice(2) : file;
        return `/wenbun-assets/${clean}`;
    });

    return { text, files };
}

async function cacheHanziData(cache) {
    // 1. Fetch zip
    const resp = await fetch("/wenbun-assets/hanzi-writer-data.zip");
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
                const url = `/wenbun-assets/hanzi-writer-data/${filename}`;
                await cache.put(url, response);
            })
        );

        const successCount = results.filter(r => r.status === "fulfilled").length;
        console.log(`[SW] cached ${i + successCount} / ${files.length} files`);
    }

    console.log("[SW] finished caching hanzi data:", files.length, "files");
}

async function hashString(str) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function cacheManifestFiles() {
    const { text, files } = await getManifestFiles();
    const manifestHash = await hashString(text);
    const CACHE_NAME = "wenbun-cache-" + manifestHash.slice(0, 16);
    
    // don't cache if the manifest has not changed
    // check if cache with key CACHE_NAME exists
    if (await caches.has(CACHE_NAME)) {
        self.__CURRENT_CACHE = CACHE_NAME;
        console.log("[SW] cache exists, done");
        return;
    }

    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(files);
    await cacheHanziData(cache);

    self.__CURRENT_CACHE = CACHE_NAME;
    console.log("[SW] cached", files.length, "files into", CACHE_NAME);
}

// Only precache when app is actually installed
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "PRECACHE_ASSETS") {
        event.waitUntil(cacheManifestFiles());
    }
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            for (const key of keys) {
                if (key.startsWith("wenbun-cache-") && key !== self.__CURRENT_CACHE) {
                    await caches.delete(key);
                    console.log("[SW] deleted old cache", key);
                }
            }
        })(),
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches
            .match(event.request)
            .then((cached) => cached || fetch(event.request)),
    );
});
