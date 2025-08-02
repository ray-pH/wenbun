import { pinyinToZhuyin } from "pinyin-zhuyin";
import { CHINESE_DICT_SRC, SLUG_NO_DATA_IN_DICT } from "./constants";
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
}>

export enum ChineseMandarinReading {
    Pinyin = 'pinyin',
    PinyinNumeric = 'pinyin_num',
    Zhuyin = 'zhuyin',
}

export interface CharacterWriterDataConfig {
    convertToTraditional?: boolean;
    mandarinReading?: ChineseMandarinReading;
}

export class ChineseCharacterWordlist {
    private dict: ChineseDict = {};
    private converter!: ChineseCharacterConverter;
    public initialized = false;
    
    constructor() {
        this.init();
    }
    
    async init(): Promise<void> {
        const res = await fetch(CHINESE_DICT_SRC);
        const data = await res.json() as ChineseDict;
        this.dict = data;
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
                tags: []
            }
        }
        
        const characters = config.convertToTraditional ? this.converter.convert(word) : word;
        const reading = this.getReading(wordData, config.mandarinReading);
        const meanings = [wordData.meaning];
        const tags: string[][] = []
        
        const numericReading = wordData.pinyin_num;
        numericReading.split(' ').forEach((reading, i) => {
            const tone = parseIntOrUndefined(reading[reading.length - 1]) ?? 0;
            tags[i] = [`${TONE_PREFIX}${tone}`];
        });
        
        return <CharacterWriterData>{ characters, reading, meanings, tags };
    }
    
    getReading(wordData: ChineseDict[string], mandarinReading: ChineseMandarinReading = ChineseMandarinReading.Pinyin): string {
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