import { App, type DeckData } from "$lib/app";
import { DECK_TAGS } from "./constants";

export interface CustomDeck {
    name: string;
    words: string[];
    lang: 'zh' | 'yue';
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

export class CustomDeckParser {
    constructor(private app: App) {
    }
    
    getDeckData(deck: CustomDeck): DeckData {
        const tags = [];
        if (deck.lang === 'yue') tags.push(DECK_TAGS.ZH_YUE);
        if (deck.isEnableCustomDictionary) tags.push(DECK_TAGS.ZH_EXTRA_DICT);
        const deckData = this.app.getInitDeckData(deck.words, tags);
        return deckData;
    }
    
    parseSimple(input: string): Partial<CustomDeck> {
        const words = input.split("\n").filter(w => w.trim() !== '');
        return { words };
    }
}