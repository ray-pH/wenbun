import { clientsClaim } from "workbox-core";

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

// async function getHanziWriterData() {
//     const resp = await fetch("/wenbun-assets/hanzi_writer_data_chars.txt");
//     const text = await resp.text();
//     const chars = text.split("");
//     const files = chars.map((char) => `/wenbun-assets/hanzi-writer-data/${char}.json`);
//     return files;
// }

async function hashString(str) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function cacheManifestFiles() {
    const { text, files } = await getManifestFiles();
    const manifestHash = await hashString(text);
    // const hanziWriterData = await getHanziWriterData();
    const CACHE_NAME = "wenbun-cache-" + manifestHash.slice(0, 16);

    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(files);
    // await cache.addAll(hanziWriterData);

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
