const SIMULATED_DATE_STORAGE_KEY = "simulatedDateIso";

const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isBrowser(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isLocalhost(): boolean {
    if (!isBrowser()) return false;
    const hostname = window.location.hostname;
    return LOCALHOST_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
}

export function canUseSimulatedDate(): boolean {
    return isLocalhost();
}

export function getSimulatedDate(): Date | undefined {
    if (!canUseSimulatedDate()) return undefined;

    const raw = window.localStorage.getItem(SIMULATED_DATE_STORAGE_KEY);
    if (!raw) return undefined;

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        window.localStorage.removeItem(SIMULATED_DATE_STORAGE_KEY);
        return undefined;
    }
    return parsed;
}

export function setSimulatedDate(date: Date | string): boolean {
    if (!canUseSimulatedDate()) return false;

    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) return false;

    window.localStorage.setItem(SIMULATED_DATE_STORAGE_KEY, parsed.toISOString());
    return true;
}

export function resetSimulatedDate(): boolean {
    if (!canUseSimulatedDate()) return false;
    window.localStorage.removeItem(SIMULATED_DATE_STORAGE_KEY);
    return true;
}

export function getNow(): Date {
    return getSimulatedDate() ?? new Date();
}

export function toDateTimeLocalValue(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value: string): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
}

export { SIMULATED_DATE_STORAGE_KEY };