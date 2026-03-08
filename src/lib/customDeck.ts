import { App, type DeckData, type Lang } from "$lib/app";
import { DECK_TAGS } from "./constants";

export interface CustomDeck {
    name: string;
    words: string[];
    customEntry?: Record<number, {r?: string, m?: string}> // reading and meaning
    lang: Lang;
    isEnableCustomDictionary: boolean;
}

export const DEFAULT_CUSTOM_DECK: CustomDeck = {
    name: '',
    words: [],
    lang: 'zh',
    isEnableCustomDictionary: false,
}

export enum CUSTOM_DECK_INPUT_TYPE {
    Simple = "simple",
    AnkiText = "ankiText",
}

export interface ParseAnkiParams {
    columnIndex: number;
    ignoreSpecialCharacters: boolean;
    importReading: boolean;
    readingColumnIndex: number;
    importMeaning: boolean;
    meaningColumnIndex: number;
}

export class CustomDeckParser {
    constructor(private app: App) {
    }
    
    getDeckData(deck: CustomDeck): DeckData {
        const tags = [];
        if (deck.lang === 'yue') tags.push(DECK_TAGS.ZH_YUE);
        if (deck.isEnableCustomDictionary) tags.push(DECK_TAGS.ZH_EXTRA_DICT);
        const deckData = this.app.getInitDeckData(deck.words, tags, deck.customEntry);
        return deckData;
    }
    
    parseSimple(input: string): Partial<CustomDeck> {
        const words = input.split("\n").filter(w => w.trim() !== '');
        return { words };
    }
    
    parseAnkiText(input: string, param: ParseAnkiParams): Partial<CustomDeck> {
        const rows = input.split("\n")
            .filter(w => w.trim() !== '' && !w.startsWith("#"))
            .map(w => w.split("\t"));
        const rawWords = rows.map(r => r[param.columnIndex - 1]);
        const words = param.ignoreSpecialCharacters ? rawWords.map(w => this.cleanWord(w)) : rawWords;
        if (param.importReading || param.importMeaning) {
            let customEntry: Record<number, {r?: string, m?: string}> = {};
            const reading = param.importReading ? rows.map(r => r[param.readingColumnIndex - 1]) : [];
            const meaning = param.importMeaning ? rows.map(r => r[param.meaningColumnIndex - 1]) : [];
            const count = Math.max(reading.length, meaning.length);
            for (let i = 0; i < count; i++) {
                customEntry[i] = { r: reading[i], m: meaning[i] };
            }
            return { words, customEntry };
        } else {
            return { words };
        }
    }
    
    cleanWord(word: string): string {
        word = word.replaceAll("。", "");
        word = word.replaceAll("？", "");
        word = word.replaceAll("，", "");
        
        return word;
    }
}