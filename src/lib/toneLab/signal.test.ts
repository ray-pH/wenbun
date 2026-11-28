import { describe, it, expect } from 'vitest';
import { analyzeSignal, spectrogram, waveform } from './signal';
import { cleanPitch, summarizeScores, type Frame } from './pitch';
const sine = (hz: number, rate = 8000) => Float32Array.from({ length: rate }, (_, i) => .5 * Math.sin(2 * Math.PI * hz * i / rate));
describe('runtime audio evidence', () => {
    it('locates the actual frequency band, including resampled inputs', () => {
        for (const rate of [8000, 48000]) {
            const spectrum = spectrogram(sine(1000, rate), rate);
            const column = spectrum.db.slice(Math.floor(spectrum.columns / 2) * spectrum.bins, (Math.floor(spectrum.columns / 2) + 1) * spectrum.bins);
            const peak = column.indexOf(Math.max(...column));
            expect(peak * 8000 / 512).toBeCloseTo(1000, 0);
        }
    });
    it('shows silence as silence rather than amplifying its spectrogram', () => {
        expect([...spectrogram(new Float32Array(8000), 8000).db].every(db => db <= -100)).toBe(true);
        expect(waveform(new Float32Array(100)).every(v => v.min === 0 && v.max === 0)).toBe(true);
        expect(analyzeSignal(new Float32Array(8000), 8000, [1]).summary.contour).toBeNull();
    });
    it('preserves short amplitude peaks in waveform envelopes', () => {
        const samples = new Float32Array(1000); samples[321] = .9; samples[322] = -.7;
        const bins = waveform(samples, 10);
        expect(bins[3].max).toBeCloseTo(.9); expect(bins[3].min).toBeCloseTo(-.7);
    });
    it('keeps raw estimates separate and preserves gaps during smoothing', () => {
        const raw: Frame[] = [200, 220, null, 240, 260].map((hz, i) => ({ hz, time: i * .02, periodicity: 1, rms: .1 }));
        const clean = cleanPitch(raw);
        expect(clean[2].hz).toBeNull(); expect(raw[0].hz).toBe(200);
        expect(clean[0].hz).toBeGreaterThan(200); expect(clean[0].hz).toBeLessThan(220);
    });
    it('rejects unsupported low onset estimates while retaining their raw evidence', () => {
        const raw: Frame[] = [80, 82, 220, 221, 222, 223, 224].map((hz, i) => ({ hz, time: i * .01, periodicity: 1, rms: .1 }));
        const clean = cleanPitch(raw);
        expect(clean[0].hz).toBeNull(); expect(clean[1].hz).toBeNull();
        expect(clean[2].hz).toBeGreaterThan(215); expect(raw[0].hz).toBe(80);
    });
    it('reports separate fit/movement metrics and excludes neutral or unusable syllables', () => {
        const result = analyzeSignal(sine(200), 8000, [1]);
        expect(result.raw).not.toBe(result.clean);
        expect(result.summary.contour).toBeGreaterThan(95); expect(result.summary.movement).toBeGreaterThan(95);
        expect(result.summary.matched).toBe(1);
        const score = result.scores[0];
        expect(score.scores[0]).toBe(Math.round(.47 * score.contourScores[0] + .53 * score.movementScores[0]));
        expect(summarizeScores([{ ...score, expected: 0 }]).eligible).toBe(0);
    });
});
