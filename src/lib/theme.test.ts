import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyColorScheme } from './theme';
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
