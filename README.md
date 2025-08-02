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
* Add online profile and data backup
* Manual/Freeform stroke input (no guidance)
* Hear the word pronounced

## Community

* Join us on [Discord](https://discord.gg/Ab25UgysDt)

## Development Credits

* [hanzi-writer](https://hanziwriter.org/) — stroke animation and writing feedback
* [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) — Chinese stroke data
* [Open FSRS](https://github.com/open-spaced-repetition) — scheduling algorithm
* [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) — Chinese vocabulary data
* [hskhsk.com](https://github.com/glxxyz/hskhsk.com) — HSK vocabulary data
* [KanjiVG](https://kanjivg.tagaini.net/) — planned source for Kanji stroke data
* [opencc-js](https://github.com/nk2028/opencc-js) — Chinese character conversion
* [pinyin-zhuyin](https://github.com/peterolson/pinyin-zhuyin) — pinyin to zhuyin/bopomofo conversion

## Tech Stack

* **Web:** Svelte
* **Desktop/Mobile:** Tauri

## Contributing & Development

* **Stay Connected:** Follow updates, join discussions, give feedback, and report bugs on our [Discord server](https://discord.gg/Ab25UgysDt).  
* **Develop:**  

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
