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
}

export interface CharacterWriterConfig {
    isFirstTime: boolean;
    isQuiz: boolean;
}

const deckToURL: Record<string, string> = {
    'old-hsk1': '/assets/decks/old-hsk1.txt',
    'test': '/assets/decks/test.txt',
}

export async function loadDeck(deckName: string): Promise<string[] | undefined> {
    const url = deckToURL[deckName];
    if (!url) return undefined;
    try {
        const res = await fetch(url);
        const text = await res.text();
        return text.split('\n');
    } catch (e) {
        console.error(e);
        return undefined;
    }
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

export function parseIntOrUndefined(value: string) {
    const n = parseInt(value, 10);
    return isNaN(n) ? undefined : n;
}