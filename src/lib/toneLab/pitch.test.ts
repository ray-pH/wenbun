import { describe, it, expect } from 'vitest';
import { extractPitch, scorePitch, spokenTones } from './pitch';
const sine = (frequency: (t: number) => number) => {
    const samples = new Float32Array(8000); let phase = 0;
    for (let i = 0; i < samples.length; i++) { phase += 2 * Math.PI * frequency(i / 8000) / 8000; samples[i] = Math.sin(phase) * .3; }
    return samples;
};
describe('pitch evidence', () => {
    it('extracts a stable fundamental', () => {
        const frames = extractPitch(sine(() => 200), 8000);
        expect(frames.filter(f => f.hz && Math.abs(f.hz - 200) < 6).length).toBeGreaterThan(40);
        expect(scorePitch(frames, [1])[0].guess).toBe(1);
    });
    it('distinguishes rising and falling contours', () => {
        expect(scorePitch(extractPitch(sine(t => 170 * 2 ** (t * 4 / 12)), 8000), [2])[0].guess).toBe(2);
        expect(scorePitch(extractPitch(sine(t => 250 * 2 ** (-t * 6 / 12)), 8000), [4])[0].guess).toBe(4);
    });
    it('does not invent voiced pitch in silence or classify neutral tones as clear', () => {
        const frames = extractPitch(new Float32Array(8000), 8000);
        expect(frames.every(f => f.hz === null)).toBe(true);
        expect(scorePitch(frames, [3])[0].guess).toBeNull();
        expect(scorePitch(extractPitch(sine(() => 200), 8000), [0])[0].flags).toContain('Neutral tone is not classified');
    });
    it('applies third-tone sandhi without changing the input', () => {
        const tones = [3, 3, 4]; expect(spokenTones(tones)).toEqual([2, 3, 4]); expect(tones).toEqual([3, 3, 4]);
    });
});
