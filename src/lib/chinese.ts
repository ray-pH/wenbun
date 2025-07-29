import { CHINESE_DICT_SRC, SLUG_NO_DATA_IN_DICT } from "./constants";
import { parseIntOrUndefined, type CharacterWriterData } from "./util";

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

export class ChineseCharacterWordlist {
    private dict: ChineseDict = {};
    public initialized = false;
    
    constructor() {
        this.init();
    }
    
    async init(): Promise<void> {
        const res = await fetch(CHINESE_DICT_SRC);
        const data = await res.json() as ChineseDict;
        this.dict = data;
        this.initialized = true;
    }
    
    getCharacterWriterData(word: string): CharacterWriterData | undefined {
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
        
        const characters = word;
        const reading = wordData.pinyin;
        const meanings = [wordData.meaning];
        const tags: string[][] = []
        
        const numericReading = wordData.pinyin_num;
        numericReading.split(' ').forEach((reading, i) => {
            const tone = parseIntOrUndefined(reading[reading.length - 1]) ?? 0;
            tags[i] = [`${TONE_PREFIX}${tone}`];
        });
        
        return <CharacterWriterData>{ characters, reading, meanings, tags };
    }
}