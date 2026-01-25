import { base } from "$app/paths";
import { isTauri } from "@tauri-apps/api/core";
import type { Lang } from "./app";
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
    lang: Lang;
}

export async function loadDeck(filename: string): Promise<string[] | undefined> {
    const url = `${base}/wenbun-assets/decks/${filename}`;
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

export function getDefaultDeckInfo(deckId: string): typeof DeckInfo[number] {
    return DeckInfo.find((s) => s.id === deckId) ?? { id: deckId, title: deckId, subtitle: ''};
}
export function isBuiltinDeck(deckId: string): boolean {
    return DeckInfo.map(d => d.id).includes(deckId);
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

export function lerp(a: number, b: number, t: number): number {
    return a * (1 - t) + b * t;
}
export function linmap(x: number, a1: number, a2: number, b1: number, b2: number): number {
    return b1 + (x - a1) * (b2 - b1) / (a2 - a1);
}

export function generateRandomString(length: number): string {
    let id = "";
    while (id.length < length) {
        id += Math.random().toString(36).slice(2);
    }
    return id.slice(0, length);
}

export function takeRandom<T>(arr: T[]): T | undefined {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function sum(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0);
}

export function isOnlineClient(): boolean {
    return !isTauri() && !isRunningInPWA();
}

export function isRunningInPWA(): boolean {
    // Chrome / Edge / Chromium (Android, desktop)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    // iOS Safari
    if ((window.navigator as any).standalone === true) {
        return true;
    }
    // Android installed PWA launched from app shortcut
    if (document.referrer.startsWith('android-app://')) {
        return true;
    }
    return false;
}

export function humanReadableByte(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const exp = Math.floor(Math.log(bytes) / Math.log(1024));
    const pre = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    return `${(bytes / Math.pow(1024, exp)).toFixed(2)} ${pre[exp]}`;
}

export function streamDownload(
    {url, callbackTotalSize, callbackDownloadedSize, callbackDone}: {
        url: string,
        callbackTotalSize: (totalSize: number | null) => void,
        callbackDownloadedSize: (downloadedSize: number) => void,
        callbackDone: (data: ArrayBuffer) => void
    }
) {
    const controller = new AbortController();

    const promise = (async () => {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) {
            throw new Error(`Failed to download ${url}: ${resp.status} ${resp.statusText}`);
        }

        const contentLength = resp.headers.get("Content-Length");
        const totalSize = contentLength ? parseInt(contentLength, 10) : null;
        callbackTotalSize(totalSize);

        const reader = resp.body?.getReader();
        if (!reader) throw new Error("ReadableStream not supported in this environment");

        let downloadedSize = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                chunks.push(value);
                downloadedSize += value.length;
                callbackDownloadedSize(downloadedSize);
            }
            if (controller.signal.aborted) {
                console.log("Download aborted");
                return;
            }
        }

        const result = new Uint8Array(downloadedSize);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        callbackDone(result.buffer);
    })();

    return {
        cancel: () => controller.abort(),
        finished: promise
    };
}