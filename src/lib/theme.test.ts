import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyColorScheme, getWriterStrokeColor, getWriterToneColor } from './theme';
import themes from './themes.json';
import { App, type ColorScheme } from './app';
import { ChineseToneColorPalette } from './constants';

describe('color schemes', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('defaults older profiles to WenBun Light and exports the selected scheme', () => {
        const app = new App();
        app.config = {} as typeof app.config;
        expect(app.getConfig(null).colorScheme).toBe('wenbun-light');
        app.config.colorScheme = 'bamboo';
        expect(app.exportProfile().config.colorScheme).toBe('bamboo');
    });

    it('preserves configured tone colors in both light and dark themes', () => {
        const style = { colorScheme: 'light' };
        vi.stubGlobal('document', { documentElement: { style } });
        vi.stubGlobal('getComputedStyle', () => ({
            getPropertyValue: (key: string) => key === '--theme-writer-stroke' ? '#eeeeee' : '',
        }));

        expect(getWriterStrokeColor()).toBe('#eeeeee');
        for (const mode of ['light', 'dark']) {
            style.colorScheme = mode;
            for (const color of ['#555555', '#7C3AED', '#123456']) {
                expect(getWriterToneColor(color)).toBe(color);
            }
            expect(getWriterToneColor(undefined)).toBe('#eeeeee');
        }
    });

    it('provides separate dark tone presets with the same tone ordering', () => {
        expect(ChineseToneColorPalette['Default Dark']).toEqual(['#7BC6F3', '#7DD5A6', '#B998FF', '#F39496', '#E9F1F4']);
        expect(ChineseToneColorPalette['Tofu Like Dark']).toEqual(['#F39496', '#7DD5A6', '#7BC6F3', '#B998FF', '#E9F1F4']);
    });

    it('preserves the original WenBun Light colors', () => {
        const light = themes.find(theme => theme.id === 'wenbun-light')!;
        expect(light.colors).toMatchObject({
            background: '#E0E0E0', blue: '#3E92CC', green: '#419E6F',
            orange: '#DA8C22', red: '#DB6B6C', 'on-blue': '#FFFFFF',
            'review-fail-text': '#DB6B6C', 'review-good-text': '#419E6F',
            'review-easy-text': '#3E92CC', 'top-bar-text': 'white',
            'writer-new-element-indicator-label-surface': 'transparent',
            'deck-table-selected-odd-background': '#FFFFFF50',
        });
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
