import themes from './themes.json';
import type { ColorScheme } from './app';


export function getWriterStrokeColor(): string {
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue('--theme-writer-stroke').trim()
        || style.getPropertyValue('--theme-text').trim()
        || '#555';
}

export function getWriterToneColor(color: string | undefined): string {
    return color || getWriterStrokeColor();
}

export function applyColorScheme(scheme: ColorScheme) {
    if (typeof document === 'undefined') return;
    const theme = themes.find(theme => theme.id === scheme) ?? themes.find(theme => theme.id === 'wenbun-light');
    if (!theme) return;
    const root = document.documentElement;
    const propertyName = (key: string) =>
        (['blue', 'green', 'orange', 'red'].includes(key) ? '--wenbun-' : '--theme-') + key;
    // Clear the previous palette so omitted colors use each component's original fallback.
    for (const palette of themes) {
        for (const key of Object.keys(palette.colors)) root.style.removeProperty(propertyName(key));
    }
    for (const [key, value] of Object.entries(theme.colors)) {
        root.style.setProperty(propertyName(key), value);
    }
    if (!('row-surface' in theme.colors)) {
        root.style.setProperty('--theme-row-surface', 'color-mix(in srgb, var(--theme-surface) 31%, transparent)');
    }
    root.style.colorScheme = theme.mode;
}
