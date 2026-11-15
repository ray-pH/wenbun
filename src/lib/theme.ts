import themes from './themes.json';
import type { ColorScheme } from './app';
import { ChineseToneColorPalette } from './constants';

export function getWriterStrokeColor(): string {
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue('--theme-writer-stroke').trim()
        || style.getPropertyValue('--theme-text').trim()
        || '#555';
}

export function getWriterToneColor(color: string | undefined, tone: number | undefined): string {
    if (!color) return getWriterStrokeColor();

    // Saved colors have no preset metadata, so only adapt matching built-in tone slots.
    const isBuiltinTone = tone && Object.values(ChineseToneColorPalette)
        .some(palette => palette[tone - 1]?.toLowerCase() === color.toLowerCase());
    if (isBuiltinTone && document.documentElement.style.colorScheme === 'dark') {
        if (color.toLowerCase() === '#7c3aed') {
            return getComputedStyle(document.documentElement).getPropertyValue('--theme-writer-tone-purple').trim() || color;
        }
        if (color.toLowerCase() === '#555555') return getWriterStrokeColor();
    }
    return color;
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
