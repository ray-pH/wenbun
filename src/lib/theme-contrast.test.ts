import { describe, expect, it } from 'vitest';
import themes from './themes.json';

const minimumContrast = 4.5;

function luminance(color: string, context: string): number {
    expect(color, `${context}: expected an opaque #RGB or #RRGGBB color`).toMatch(/^#(?:[\da-f]{3}|[\da-f]{6})$/i);
    const hex = color.slice(1);
    const expanded = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex;
    const channels = [0, 2, 4].map(offset => {
        const value = parseInt(expanded.slice(offset, offset + 2), 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function checkContrast(themeId: string, colors: Record<string, string | undefined>, foreground: string, background: string) {
    const context = `${themeId}: ${foreground} on ${background}`;
    expect(colors[foreground], `${context}: add the ${foreground} token to themes.json`).toBeDefined();
    expect(colors[background], `${context}: add the ${background} token to themes.json`).toBeDefined();
    const foregroundLuminance = luminance(colors[foreground]!, `${context} (${foreground})`);
    const backgroundLuminance = luminance(colors[background]!, `${context} (${background})`);
    const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
        / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
    expect(ratio, `${context}: ${colors[foreground]} on ${colors[background]} has contrast ${ratio.toFixed(2)}:1; adjust these tokens to reach at least ${minimumContrast}:1`).toBeGreaterThanOrEqual(minimumContrast);
}

describe('bundled theme contrast', () => {
    for (const theme of themes) {
        const colors: Record<string, string | undefined> = theme.colors;
        describe(theme.id, () => {
            for (const foreground of ['text', 'muted']) {
                for (const background of ['background', 'surface', 'surface-alt']) {
                    it(`${foreground} on ${background} meets WCAG AA`, () => {
                        checkContrast(theme.id, colors, foreground, background);
                    });
                }
            }

            for (const fill of ['blue', 'green', 'orange', 'red']) {
                it(`on-${fill} on ${fill} meets WCAG AA`, () => {
                    checkContrast(theme.id, colors, `on-${fill}`, fill);
                });
            }

            for (const foreground of ['review-fail-text', 'review-good-text', 'review-easy-text']) {
                if (foreground in colors) {
                    for (const background of ['background', 'surface-alt']) {
                        it(`${foreground} on ${background} meets WCAG AA`, () => {
                            checkContrast(theme.id, colors, foreground, background);
                        });
                    }
                }
            }
        });
    }
});
