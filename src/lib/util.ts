import { base } from "$app/paths";
import { DeckInfo } from "./constants";

export type DeepRequired<T> =
  // Leave functions as-is
  T extends (...args: any[]) => any ? T :
  // Recurse into arrays
  T extends Array<infer U>       ? DeepRequiredArray<U> :
  // Recurse into plain objects
  T extends object               ? { [K in keyof T]-?: DeepRequired<T[K]> } :
  // Primitives, etc.
                                  T
interface DeepRequiredArray<T> extends Array<DeepRequired<T>> {}

export interface CharacterWriterData {
    characters: string;
    reading: string;
    meanings: string[];
    tags: string[][]; // separate tags for each character
    audioUrl: string[][];
}

export interface CharacterWriterConfig {
    isFirstTime: boolean;
    isWarmUp: boolean;
    isFinalWarmUp: boolean;
    warmUpCount: number | undefined;
    warmUpMaxCount: number;
    isGradeWarmUpCards: boolean;
    isShowOutline: boolean;
    lang: 'zh' | 'yue';
}

export async function loadDeck(filename: string): Promise<string[] | undefined> {
    const url = `${base}/assets/decks/${filename}`;
    try {
        const res = await fetch(url);
        const text = await res.text();
        return text.split('\n');
    } catch (e) {
        console.error(e);
        return undefined;
    }
}

export function getDeckFilename(deckId: string): string {
    return DeckInfo.find(d => d.id === deckId)?.src ?? `${deckId}.txt`;
}

export function dateDiff(start: Date, end: Date): { days: number, hours: number, minutes: number, seconds: number, milliseconds: number } {
    let delta = end.getTime() - start.getTime();
    const milliseconds = delta % 1000;
    delta = Math.floor(delta / 1000);
    const seconds = delta % 60;
    delta = Math.floor(delta / 60);
    const minutes = delta % 60;
    delta = Math.floor(delta / 60);
    const hours = delta % 24;
    delta = Math.floor(delta / 24);
    const days = delta;
    return { days, hours, minutes, seconds, milliseconds };
}
export function dateDiffFormatted(start: Date, end: Date): string {
    const diff = dateDiff(start, end);
    if (diff.days > 0) {
        return `${diff.days}d`
    }
    if (diff.hours > 0) {
        return `${diff.hours}h`
    }
    if (diff.minutes > 0) {
        return `<${diff.minutes}m`
    }
    return '<1m';
    // if (diff.seconds > 0) {
    //     const prefix = isShowLessThan ? '<' : '';
    //     return `${prefix}${diff.seconds}s`
    // }
    // return `${diff.milliseconds}ms`
}

export function getDaysSinceEpochLocal(date = new Date()): number {
    const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor(localMidnight.getTime() / (1000 * 60 * 60 * 24));
}

export function parseIntOrUndefined(value: string) {
    const n = parseInt(value, 10);
    return isNaN(n) ? undefined : n;
}

export function semverBiggerThan(a: string, b: string): boolean {
    return compareSemver(a, b) > 0;
}

export function compareSemver(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aNum = aParts[i] ?? 0; // default to 0 if missing
        const bNum = bParts[i] ?? 0;

        if (aNum > bNum) return 1;
        if (aNum < bNum) return -1;
    }
    return 0; // equal
}