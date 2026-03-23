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
    CSV = "csv",
}

export interface ParseParams {
    columnIndex: number;
    ignoreSpecialCharacters: boolean;
    importReading: boolean;
    readingColumnIndex: number;
    importMeaning: boolean;
    meaningColumnIndex: number;
    ignoreHeader: boolean;
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
    
    parseAnkiText(input: string, param: ParseParams): Partial<CustomDeck> {
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

    parseCSV(input: string, param: ParseParams): Partial<CustomDeck> {
        const parseLine = (line: string): string[] => {
            const cells: string[] = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (inQuotes) {
                    if (ch === '"') {
                        const next = line[i + 1];
                        if (next === '"') {
                            current += '"';
                            i++;
                        } else {
                            inQuotes = false;
                        }
                    } else {
                        current += ch;
                    }
                } else {
                    if (ch === '"') {
                        inQuotes = true;
                    } else if (ch === ",") {
                        cells.push(current);
                        current = "";
                    } else {
                        current += ch;
                    }
                }
            }
            cells.push(current);
            return cells;
        };
        let input_nl_normalized = input
            .replace(/\r/gm, "")
            .replace(/\n+/gm, "\n");

        // Replace any and all new lines enclosed in "..." with a ';'
        let one_line_entries = "";
        let q = 0;
        for (let i = 0; i < input_nl_normalized.length; i++) {
            if (input_nl_normalized.at(i) == '"') {
                q += 1;
            } else if (input_nl_normalized.at(i) == '\n' && q % 2 == 1) {
                // Skip new line within ".."
                one_line_entries += " ; ";
                continue;
            }
            one_line_entries += input_nl_normalized.at(i);
        }

        const rows = one_line_entries
            .split("\n")
            .filter(w => w.trim() !== '' && !w.startsWith("#"))
            .slice(param.ignoreHeader ? 1 : 0)
            .map(parseLine);

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
    
    // Remove punctuation
    // See https://en.wikipedia.org/wiki/Chinese_punctuation
    cleanWord(word: string): string {
        word = word.replaceAll("。", "");
        word = word.replaceAll("？", "");
        word = word.replaceAll("，", "");
        word = word.replaceAll("、", "");
        word = word.replaceAll("—", "");
        word = word.replaceAll("！", "");
        word = word.replaceAll("：", "");
        word = word.replaceAll("；", "");
        word = word.replaceAll("（", "");
        word = word.replaceAll("）", "");
        word = word.replaceAll("…", "");
        word = word.replaceAll("”", "");
        word = word.replaceAll("“", "");
        word = word.replaceAll("‘", "");
        word = word.replaceAll("’", "");
        word = word.replaceAll("《", "");
        word = word.replaceAll("》", "");
        word = word.replaceAll("﹏", "");
        word = word.replaceAll("·", "");
        // Remove any extended ASCII character.
        // Not fail safe, but good enough to remove all
        // English mixed in with Chinese.
        word = word.replaceAll(/[\x00-\xff]/g, "");

        return word;
    }
}
