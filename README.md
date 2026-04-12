<img width="128" height="128" src="https://raw.githubusercontent.com/ray-pH/wenbun/refs/heads/main/static/favicon.png" alt="WenBun Icon">

# Wenbun (文文)

**Wenbun** is an open-source app for learning Chinese characters through interactive writing practice and spaced repetition. It combines flashcard-style review with stroke-by-stroke training and will be available on desktop, web, and mobile (Android, iOS).

"Wenbun" combines the Mandarin (`wén`) and Japanese (`bun`) readings of 文, meaning "character" or "writing."

>  Naming it Wenbun might be shooting ourselves in the foot. It pretty much commits us to supporting Japanese too.

## Features

* **Character Writing Practice:** Practice stroke order with real-time feedback using [hanzi-writer](https://hanziwriter.org/).
* **Spaced Repetition Scheduling:** Uses the **FSRS** algorithm to optimize review timing.
* **Preloaded Vocabulary Decks:** Includes HSK vocabulary lists.
* **Previously Studied Cards:** Tag and prioritize cards you've already studied in another system for faster integration.

## Roadmap

* Add support for Japanese Kanji (JLPT levels)
* Add Chinese dictionary lookup
* Manual/Freeform stroke input (no guidance)

## Community

* Join us on [Discord](https://discord.gg/pVUuqJqywt)
* Backend server repo: [wenbun-server](https://github.com/ray-pH/wenbun-server) — currently only used for profile data sync.
* Core functionality (learning, reviews, writing practice, and scheduling) is client-side and does not require the backend.

## Development Credits

* [hanzi-writer](https://hanziwriter.org/) — stroke animation and writing feedback
* [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) — Chinese stroke data
* [makemeahanzi](https://github.com/skishore/makemeahanzi) — Free, open-source Chinese character data
* [Open FSRS](https://github.com/open-spaced-repetition) — scheduling algorithm
* [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) — Chinese vocabulary data

* [opencc-js](https://github.com/nk2028/opencc-js) — Chinese character conversion
* [pinyin-zhuyin](https://github.com/peterolson/pinyin-zhuyin) — pinyin to zhuyin/bopomofo conversion
* [PyJyutping](https://github.com/MacroYau/PyJyutping) — Cantonese romanization conversion
* [audio-cmn](https://github.com/hugolpz/audio-cmn) — Mandarin pronounciation recording data
* [Lingua Libre](https://lingualibre.org/wiki/LinguaLibre:Main_Page) — Mandarin and Cantonese pronounciation recording data

## Tech Stack

* **Web:** Svelte
* **Desktop/Mobile:** Tauri

## Contributing & Development

* **Stay Connected:** Follow updates, join discussions, give feedback, and report bugs on our [Discord server](https://discord.gg/pVUuqJqywt).  
* **Develop:**  

Clone with submodules

```
git clone --recurse-submodules https://github.com/ray-pH/wenbun.git
```

Install dependencies:  
```bash
npm install
```  
    
Web version:  
```bash
npm run dev
```  

Desktop/Mobile (Tauri):  
```bash
npm run tauri dev
```

### Troubleshooting

**npm run dev fails with `ENOSPC: System limit for number of file watchers reached, watch <SOME_DIR>`**

You can either [increase the number of watchers](https://stackoverflow.com/questions/22475849/node-js-what-is-enospc-error-and-how-to-solve)
or ignore the directory in vite (example with `static/wenbun-assets`):

```diff
diff --git a/vite.config.js b/vite.config.js
index ddedcb4d..ae269c02 100644
--- a/vite.config.js
+++ b/vite.config.js
@@ -50,7 +50,7 @@ export default defineConfig(async () => ({
       : undefined,
     watch: {
       // 3. tell vite to ignore watching `src-tauri`
-      ignored: ["**/src-tauri/**"],
+      ignored: ["**/src-tauri/**", "**/static/wenbun-assets/**"],
     },
   },
 }));
```

### Deployment Note For Publishing

For Android builds, ensure the correct version name is set in `src-tauri/gen/android/app/tauri.properties`. You may need to update this file manually before deployment.