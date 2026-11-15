import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyColorScheme, getWriterStrokeColor, getWriterToneColor } from './theme';
import themes from './themes.json';
import { App, type ColorScheme } from './app';

describe('color schemes', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('defaults older profiles to WenBun Light and exports the selected scheme', () => {
        const app = new App();
        app.config = {} as typeof app.config;
        expect(app.getConfig(null).colorScheme).toBe('wenbun-light');
        app.config.colorScheme = 'bamboo';
        expect(app.exportProfile().config.colorScheme).toBe('bamboo');
    });

    it('uses theme-aware writer colors while preserving custom and light-theme tones', () => {
        const style = { colorScheme: 'light' };
        vi.stubGlobal('document', { documentElement: { style } });
        vi.stubGlobal('getComputedStyle', () => ({
            getPropertyValue: (key: string) => key === '--theme-writer-stroke' ? '#eeeeee' : key === '--theme-writer-tone-purple' ? '#b998ff' : '',
        }));

        expect(getWriterStrokeColor()).toBe('#eeeeee');
        expect(getWriterToneColor(undefined, undefined)).toBe('#eeeeee');
        expect(getWriterToneColor('#555555', 5)).toBe('#555555');
        expect(getWriterToneColor('#7C3AED', 3)).toBe('#7C3AED');

        style.colorScheme = 'dark';
        expect(getWriterToneColor('#555555', 5)).toBe('#eeeeee');
        expect(getWriterToneColor('#7c3aed', 3)).toBe('#b998ff');
        expect(getWriterToneColor('#7C3AED', 4)).toBe('#b998ff');
        expect(getWriterToneColor('#555555', 1)).toBe('#555555');
        expect(getWriterToneColor('#123456', 5)).toBe('#123456');
        expect(getWriterToneColor('#3E92CC', 1)).toBe('#3E92CC');
        expect(getWriterToneColor('', 5)).toBe('#eeeeee');
    });

    it('applies each palette and falls back for an unknown saved scheme', () => {
        const setProperty = vi.fn();
        const removeProperty = vi.fn();
        const style = { setProperty, removeProperty, colorScheme: '' };
        vi.stubGlobal('document', { documentElement: { style } });
        for (const theme of themes) {
            applyColorScheme(theme.id);
            expect(setProperty).toHaveBeenCalledWith('--theme-background', theme.colors.background);
            expect(setProperty).toHaveBeenCalledWith('--wenbun-blue', theme.colors.blue);
            expect(style.colorScheme).toBe(theme.mode);
        }
        applyColorScheme('unknown' as ColorScheme);
        expect(setProperty).toHaveBeenCalledWith('--wenbun-red', themes.find(theme => theme.id === 'wenbun-light')!.colors.red);
        expect(setProperty).toHaveBeenCalledWith('--theme-writer-grid-surface', '#FFFFFF90');
        expect(removeProperty).toHaveBeenCalledWith('--theme-surface');
        expect(style.colorScheme).toBe('light');
    });
});
