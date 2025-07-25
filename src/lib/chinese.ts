import { CHINESE_WORLISTS_SRC, SLUG_NO_DATA_IN_DICT } from "./constants";
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

export class ChineseCharacterWordlist {
    private map: Map<string, ChineseWordData> = new Map();
    public initialized = false;
    
    constructor() {
        this.init();
    }
    
    async init(): Promise<void> {
        for (const url of CHINESE_WORLISTS_SRC) {
            const res = await fetch(url);
            const data = await res.json() as ChineseWordData[];
            // generate map
            for (const word of data) {
                this.map.set(word.simplified, word);
            }
        }
        this.initialized = true;
    }
    
    getCharacterWriterData(word: string): CharacterWriterData | undefined {
        const wordData = this.map.get(word);
        if (!wordData) {
            return {
                characters: word,
                reading: word,
                meanings: [SLUG_NO_DATA_IN_DICT],
                tags: []
            }
        }
        
        const characters = wordData.simplified;
        const reading = wordData.forms[0].transcriptions.pinyin;
        const meanings = wordData.forms.map((f) => f.meanings).flat();
        const tags: string[][] = []
        
        const numericReading = wordData.forms[0].transcriptions.numeric;
        numericReading.split(' ').forEach((reading, i) => {
            const tone = parseIntOrUndefined(reading[reading.length - 1]) ?? 0;
            tags[i] = [`${TONE_PREFIX}${tone}`];
        });
        
        return <CharacterWriterData>{ characters, reading, meanings, tags };
    }
}