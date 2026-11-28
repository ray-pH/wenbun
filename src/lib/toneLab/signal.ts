import { cleanPitch, extractRawPitch, scorePitch, summarizeScores } from './pitch';
export function waveform(samples: Float32Array, columns = 600) {
    return Array.from({ length: Math.min(columns, samples.length) }, (_, i) => {
        const start = Math.floor(i * samples.length / Math.min(columns, samples.length));
        const end = Math.floor((i + 1) * samples.length / Math.min(columns, samples.length));
        let min = 0, max = 0;
        for (let j = start; j < end; j++) { min = Math.min(min, samples[j]); max = Math.max(max, samples[j]); }
        return { min, max };
    });
}
// Radix-2 FFT of Hann-windowed audio, expressed in dBFS (no per-clip normalization).
export function spectrogram(samples: Float32Array, rate: number) {
    const size = 512, analysisRate = 8000;
    const data = new Float32Array(Math.floor(samples.length * analysisRate / rate));
    for (let i = 0; i < data.length; i++) {
        const start = Math.floor(i * rate / analysisRate), end = Math.max(start + 1, Math.floor((i + 1) * rate / analysisRate));
        let sum = 0; for (let j = start; j < Math.min(end, samples.length); j++) sum += samples[j];
        data[i] = sum / (Math.min(end, samples.length) - start);
    }
    const columns = Math.max(1, Math.min(500, Math.ceil(data.length / 80))), bins = size / 2 + 1;
    const db = new Float32Array(columns * bins);
    for (let col = 0; col < columns; col++) {
        const real = new Float64Array(size), imag = new Float64Array(size);
        const center = Math.floor(col / Math.max(1, columns - 1) * Math.max(0, data.length - 1));
        for (let i = 0; i < size; i++) real[i] = (data[center + i - size / 2] || 0) * (.5 - .5 * Math.cos(2 * Math.PI * i / (size - 1)));
        for (let i = 1, j = 0; i < size; i++) {
            let bit = size >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
            if (i < j) [real[i], real[j]] = [real[j], real[i]];
        }
        for (let length = 2; length <= size; length *= 2) {
            for (let start = 0; start < size; start += length) for (let j = 0; j < length / 2; j++) {
                const angle = -2 * Math.PI * j / length, a = start + j, b = a + length / 2;
                const re = real[b] * Math.cos(angle) - imag[b] * Math.sin(angle), im = real[b] * Math.sin(angle) + imag[b] * Math.cos(angle);
                real[b] = real[a] - re; imag[b] = imag[a] - im; real[a] += re; imag[a] += im;
            }
        }
        for (let bin = 0; bin < bins; bin++) db[col * bins + bin] = 20 * Math.log10(Math.max(1e-6, Math.hypot(real[bin], imag[bin]) * 4 / size));
    }
    return { columns, bins, db, maxHz: analysisRate / 2 };
}
export function analyzeSignal(samples: Float32Array, rate: number, tones: number[]) {
    const raw = extractRawPitch(samples, rate), clean = cleanPitch(raw), scores = scorePitch(clean, tones);
    const frequencies = clean.filter(f => f.hz).map(f => f.hz!).sort((a,b) => a-b);
    return { raw, clean, scores, summary: summarizeScores(scores), waveform: waveform(samples), spectrogram: spectrogram(samples, rate), duration: samples.length / rate,
        median: frequencies.length ? frequencies[Math.floor(frequencies.length / 2)] : null,
        min: frequencies[0] ?? null, max: frequencies.at(-1) ?? null };
}
export type Analysis = ReturnType<typeof analyzeSignal>;
