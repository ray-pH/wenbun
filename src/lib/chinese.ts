import { pinyinToZhuyin } from "pinyin-zhuyin";
import { CHINESE_CC_CEDICT_SRC, CHINESE_CUSTOM_NOTES_SRC, CHINESE_DICT_SRC, CHINESE_MAKEMEAHANZI_SRC, HANZI_WRITER_DATA_CHARS_SRC, SLUG_NO_DATA_IN_DICT, WENBUN_AUDIO_URL, WENBUN_AUDIO_ZH_PREFIX_SRC, YUE_AUDIO_DICT_SRC, ZH_AUDIO_DICT_SRC } from "./constants";
import { parseIntOrUndefined, type CharacterWriterData } from "./util";
import * as OpenCC from 'opencc-js';

export const TONE_PREFIX = 'tone-';

export interface ChineseWordData {
    simplified: string;
    radical: string;
    frequency: number;
    pos: string[];
    forms: {
        traditional: string;
        transcriptions: {
            pinyin: string;
            numeric: string;
            wadegiles: string;
            bopomofo: string;
            romatzyh: string;
        };
        meanings: string[];
        classifiers: string[];
    }[];
}

export type ChineseDict = Record<string, {
    meaning: string,
    pinyin_num: string,
    pinyin: string,
    jyutping: string,
}>

// https://github.com/skishore/makemeahanzi
export interface IChineseCharDecomposition {
    character: string,
    definition?: string,
    pinyin: string[],
    decomposition: string,
    etymology?: {
        type: "ideographic" | "pictographic" | "pictophonetic",
        hint: string,
        phonetic?: string,
        semantic?: string,
    },
    radical: string,
    // matches: 
}

export enum ChineseMandarinReading {
    Pinyin = 'pinyin',
    PinyinNumeric = 'pinyin_num',
    Zhuyin = 'zhuyin',
}

export interface CharacterWriterDataConfig {
    convertToTraditional?: boolean;
    mandarinReading?: ChineseMandarinReading;
    isCantonese?: boolean;
    isPlayAudio?: boolean;
}

export class ChineseCharacterWordlist {
    public dict: ChineseDict = {};
    private converter!: ChineseCharacterConverter;
    private simplifiedConverter!: ChineseCharacterConverter;
    private audioDict: Record<string, string[]> = {};
    private hanziWriterDataChars: Set<string> = new Set();
    private charDecompositionDict: Record<string, IChineseCharDecomposition> = {};
    private customNotes: Record<string, string> = {};
    public lang: 'zh' | 'yue' = 'zh';
    public initialized = false;
    
    constructor() {
    }
    
    async init(lang: 'zh' | 'yue', useExtraDict: boolean = false): Promise<void> {
        this.lang = lang;
        const dictP = async () => {
            const res = await fetch(CHINESE_DICT_SRC)
            const dict = await res.json();
            this.dict = dict;
            if(useExtraDict){
                const res = await fetch(CHINESE_CC_CEDICT_SRC)
                const dict = await res.json();
                Object.entries(dict).forEach(([k, v]: [string, any]) => {
                    // meaning, pinyin_num, pinyin, jyutping,
                    if (this.dict[k] === undefined) {
                        this.dict[k] = {
                            meaning: v[0],
                            pinyin_num: v[1],
                            pinyin: v[2],
                            jyutping: v[3],
                        }
                    }
                });
            }
        } 
        const audioDictP = async () => {
            const res = await fetch(lang === 'zh' ? ZH_AUDIO_DICT_SRC : YUE_AUDIO_DICT_SRC)
            const dict = await res.json();
            this.audioDict = dict;
        }
        const hanziWriterDataCharsP = async () => {
            const res = await fetch(HANZI_WRITER_DATA_CHARS_SRC);
            const chars = await res.text();
            this.hanziWriterDataChars = new Set(chars);
        }
        const charDecompositionDictP = async () => {
            const res = await fetch(CHINESE_MAKEMEAHANZI_SRC);
            const text = await res.text();
            const dict: any = {};
            // jsonl
            text.split('\n').forEach(line => {
                try {
                    const data = JSON.parse(line);
                    dict[data.character] = data;
                } catch (e) {
                    console.error(e);
                }
            });
            this.charDecompositionDict = dict;
        }
        const notesDictP = async () => {
            const res = await fetch(CHINESE_CUSTOM_NOTES_SRC);
            const text = await res.text();
            const dict: any = {};
            // jsonl
            text.split('\n').forEach(line => {
                try {
                    if (line.trim().length == 0) return;
                    const data = JSON.parse(line);
                    dict[data.char] = data.note;
                } catch (e) {
                    console.error(e);
                }
            });
            this.customNotes = dict;
        }
        await Promise.allSettled([dictP(), audioDictP(), hanziWriterDataCharsP(), charDecompositionDictP(), notesDictP()]);
        this.converter = new ChineseCharacterConverter('cn', 'tw');
        this.simplifiedConverter = new ChineseCharacterConverter('tw', 'cn');
        this.initialized = true;
    }
    
    getCharacterWriterData(word: string, config: CharacterWriterDataConfig = {}): CharacterWriterData | undefined {
        word = word.replace(/\r/g, '');
        const wordData = this.getWordData(word);
        if (!wordData) {
            return {
                characters: word,
                reading: word,
                meanings: [SLUG_NO_DATA_IN_DICT],
                audioUrl: [],
                tags: []
            }
        }
        
        const characters = config.convertToTraditional ? this.converter.convert(word) : word;
        const reading = this.getReading(word, this.lang, config.mandarinReading);
        const meanings = [wordData.meaning];
        const audioUrl = config.isPlayAudio ? this.getAudioUrlArray(word) : [];
        const tags: string[][] = []
        
        const numericReading = wordData.pinyin_num;
        numericReading.split(' ').forEach((reading, i) => {
            const tone = parseIntOrUndefined(reading[reading.length - 1]) ?? 0;
            tags[i] = [`${TONE_PREFIX}${tone}`];
        });
        
        return <CharacterWriterData>{ characters, reading, meanings, audioUrl, tags };
    }
    
    getWordData(word: string): ChineseDict[string] | undefined {
        return this.dict[word] ?? this.dict[this.simplifiedConverter.convert(word)];
    }
    
    getAudioUrlArray(word: string): string[][] {
        if (this.audioDict[word]) {
            return this.audioDict[word].map(u => [u]);
        } else if (this.lang == 'zh'){
            // generate audio url from pinyin
            const pinyin_num = this.getWordData(word)?.pinyin_num ?? '';
            const syls = pinyin_num.split(' ');
            return [syls.map(s => `${WENBUN_AUDIO_ZH_PREFIX_SRC}${s}.mp3`)];
        } else if (this.lang == 'yue') {
            return [];
        } else {
            return [];
        }
        // return this.audioDict[word]?.map(u => [u]) ?? [];
    }
    
    getReading(
        word: string,
        lang: 'zh' | 'yue' = 'zh',
        mandarinReading: ChineseMandarinReading = ChineseMandarinReading.Pinyin
    ): string {
        const wordData = this.getWordData(word);
        if (!wordData) return '';
        switch (lang) {
            case 'yue': {
                return wordData.jyutping;
            }
            case 'zh': {
                switch (mandarinReading) {
                    case ChineseMandarinReading.Pinyin: return wordData.pinyin;
                    case ChineseMandarinReading.PinyinNumeric: return wordData.pinyin_num;
                    case ChineseMandarinReading.Zhuyin: return pinyinToZhuyin(wordData.pinyin_num);
                }
            }
        }
        return '';
    }
    
    getCharDecompData(char: string): IChineseCharDecomposition | undefined {
        return this.charDecompositionDict[char];
    }
    
    getWordDecompData(word: string): IChineseCharDecomposition[] {
        return word.split('').map(c => this.getCharDecompData(c)).filter(d => d) as IChineseCharDecomposition[];
    }
    
    isWordSupportedByHanziWriter(word: string): boolean {
        word = word.replace(/\r/g, '');
        return Array.from(word).every(c => this.isCharSupportedByHanziWriter(c));
    }
    
    isCharSupportedByHanziWriter(char: string): boolean {
        return this.hanziWriterDataChars.has(char);
    }
    
    toTraditional(char: string): string {
        return this.converter.convert(char);
    }
    toSimplified(char: string): string {
        return this.simplifiedConverter.convert(char);
    }
    
    getCustomNote(char: string): string | undefined {
        return this.customNotes[char];
    }
}

export class ChineseCharacterConverter {
    converter: OpenCC.ConvertText;
    
    constructor(from: OpenCC.Locale, to: OpenCC.Locale) {
        this.converter = OpenCC.Converter({from, to});
    }
    convert(text: string): string {
        return this.converter(text);
    }
}

const AUDIO_LANG_DIR = {
    'zh': 'mandarin',
    'yue': 'yue'
}
export function getAudioUrl(lang: 'zh' | 'yue', relativePath: string): string {
    const dir = AUDIO_LANG_DIR[lang];
    return `${WENBUN_AUDIO_URL}/${dir}/${encodeURI(relativePath)}`;
}
export function toneFromPinyin(pinyin: string): number {
    // number form (e.g., "ma3")
    const m = pinyin.match(/[1-5]$/);
    if (m) return +m[0];

    // handle precomposed + decomposed + uppercase + ü (u + U+0308)
    const nfd = pinyin.normalize('NFD');
    if (nfd.includes('\u0304')) return 1; // macron
    if (nfd.includes('\u0301')) return 2; // acute
    if (nfd.includes('\u030C')) return 3; // caron
    if (nfd.includes('\u0300')) return 4; // grave
    return 5; // neutral
}
// U+2FF0–U+2FFB (⿰ ⿱ ⿲ ⿳ ⿴ ⿵ ⿶ ⿷ ⿸ ⿹ ⿺ ⿻).
export function stripIDC(s: string): string {
    return s.replace(/[\u2FF0-\u2FFB]/gu, "");
}
export type TaggedChunk = { text: string; isChineseChar?: true };
export function tagChineseChars(input: string): TaggedChunk[] {
    const out: TaggedChunk[] = [];
    let buf = "";
    for (const ch of input) {
        const isHan = /\p{Script=Han}/u.test(ch); // covers all CJK Unified Ideographs (incl. extensions, compat)
        if (isHan) {
            if (buf) { out.push({ text: buf }); buf = ""; }
            out.push({ text: ch, isChineseChar: true });
        } else {
            buf += ch;
        }
    }
    if (buf) out.push({ text: buf });
    return out;
}