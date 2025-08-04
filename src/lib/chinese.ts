import { pinyinToZhuyin } from "pinyin-zhuyin";
import { CHINESE_DICT_SRC, SLUG_NO_DATA_IN_DICT, WENBUN_AUDIO_URL, WENBUN_AUDIO_ZH_PREFIX_SRC, YUE_AUDIO_DICT_SRC, ZH_AUDIO_DICT_SRC } from "./constants";
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

type ChineseDict = Record<string, {
    meaning: string,
    pinyin_num: string,
    pinyin: string,
    jyutping: string,
}>

export enum ChineseMandarinReading {
    Pinyin = 'pinyin',
    PinyinNumeric = 'pinyin_num',
    Zhuyin = 'zhuyin',
}

export interface CharacterWriterDataConfig {
    convertToTraditional?: boolean;
    mandarinReading?: ChineseMandarinReading;
    isCantonese?: boolean;
}

export class ChineseCharacterWordlist {
    private dict: ChineseDict = {};
    private converter!: ChineseCharacterConverter;
    private audioDict: Record<string, string[]> = {};
    public lang: 'zh' | 'yue' = 'zh';
    public initialized = false;
    
    constructor() {
    }
    
    async init(lang: 'zh' | 'yue'): Promise<void> {
        this.lang = lang;
        const dictP = fetch(CHINESE_DICT_SRC)
            .then(res => res.json())
            .then(dict => this.dict = dict);
        const audioDictP = fetch(lang === 'zh' ? ZH_AUDIO_DICT_SRC : YUE_AUDIO_DICT_SRC)
            .then(res => res.json())
            .then(dict => this.audioDict = dict);
        await Promise.allSettled([dictP, audioDictP]);
        this.converter = new ChineseCharacterConverter('cn', 'tw');
        this.initialized = true;
    }
    
    getCharacterWriterData(word: string, config: CharacterWriterDataConfig = {}): CharacterWriterData | undefined {
        word = word.replace(/\r/g, '');
        const wordData = this.dict[word];
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
        const reading = this.getReading(wordData, config.mandarinReading, config.isCantonese);
        const meanings = [wordData.meaning];
        const audioUrl = this.getAudioUrlArray(word);
        const tags: string[][] = []
        
        const numericReading = wordData.pinyin_num;
        numericReading.split(' ').forEach((reading, i) => {
            const tone = parseIntOrUndefined(reading[reading.length - 1]) ?? 0;
            tags[i] = [`${TONE_PREFIX}${tone}`];
        });
        
        return <CharacterWriterData>{ characters, reading, meanings, audioUrl, tags };
    }
    
    getAudioUrlArray(word: string): string[][] {
        if (this.audioDict[word]) {
            return this.audioDict[word].map(u => [u]);
        } else if (this.lang == 'zh'){
            // generate audio url from pinyin
            const pinyin_num = this.dict[word].pinyin_num;
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
        wordData: ChineseDict[string], 
        mandarinReading: ChineseMandarinReading = ChineseMandarinReading.Pinyin,
        isCantonese: boolean = false
    ): string {
        if (isCantonese) {
            return wordData.jyutping;
        }
        switch (mandarinReading) {
            case ChineseMandarinReading.Pinyin: return wordData.pinyin;
            case ChineseMandarinReading.PinyinNumeric: return wordData.pinyin_num;
            case ChineseMandarinReading.Zhuyin: return pinyinToZhuyin(wordData.pinyin_num);
        }
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