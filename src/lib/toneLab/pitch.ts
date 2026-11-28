// Experimental pitch evidence calculated in the browser.
export const ALGORITHM = 'wenbun-pitch-2';
export type Frame = { time: number; hz: number | null; periodicity: number; rms: number };
export type SyllableScore = { start: number; end: number; expected: number; guess: number | null; coverage: number; contourScores: number[]; movementScores: number[]; scores: number[]; margin: number; flags: string[] };
export function spokenTones(tones: number[]) {
    const result = [...tones];
    for (let i = 0; i < tones.length - 1; i++) if (tones[i] === 3 && tones[i + 1] === 3) result[i] = 2;
    return result;
}
export function extractRawPitch(samples: Float32Array, rate: number): Frame[] {
    const data = new Float32Array(Math.floor(samples.length * 8000 / rate));
    for (let i = 0; i < data.length; i++) {
        const start = Math.floor(i * rate / 8000), end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * rate / 8000)));
        let sum = 0; for (let j = start; j < end; j++) sum += samples[j];
        data[i] = sum / (end - start);
    }
    const frames: Frame[] = [];
    const size = 320, minLag = 13, maxLag = 129;
    for (let offset = 0; offset + size < data.length; offset += 80) {
        let energy = 0;
        for (let j = 0; j < size; j++) energy += data[offset + j] ** 2;
        const rms = Math.sqrt(energy / size);
        let lag = 0, best = 1, cumulative = 0;
        const difference = new Float32Array(maxLag + 1);
        if (rms > .006) for (let tau = 1; tau <= maxLag; tau++) {
            let sum = 0;
            for (let j = 0; j < size - maxLag; j++) sum += (data[offset + j] - data[offset + j + tau]) ** 2;
            cumulative += sum;
            difference[tau] = cumulative ? sum * tau / cumulative : 1;
            if (tau >= minLag && difference[tau] < best) { best = difference[tau]; lag = tau; }
            if (tau > minLag && difference[tau - 1] < .16 && difference[tau] > difference[tau - 1]) { lag = tau - 1; best = difference[lag]; break; }
        }
        const left = difference[lag - 1], center = difference[lag], right = difference[lag + 1];
        const curvature = left - 2 * center + right;
        const shift = lag > minLag && lag < maxLag && Number.isFinite(curvature) && Math.abs(curvature) > 1e-8 ? Math.max(-.5, Math.min(.5, .5 * (left - right) / curvature)) : 0;
        frames.push({ time: offset / 8000, hz: lag && best < .35 ? 8000 / (lag + shift) : null, periodicity: 1 - best, rms });
    }
    return frames;
}
export function cleanPitch(raw: Frame[]): Frame[] {
    let frames = raw.map(f => ({ ...f, hz: f.periodicity >= .7 ? f.hz : null }));
    // Correct isolated octave errors without bridging gaps.
    for (let i = 1; i < frames.length - 1; i++) {
        const a = frames[i - 1].hz, b = frames[i].hz, c = frames[i + 1].hz;
        if (a && b && c && Math.abs(Math.log2(a / c)) < .15 && Math.abs(Math.log2(b / a)) > .8) frames[i].hz = b * (b > a ? .5 : 2);
    }
    // Reject unsupported onset/offset pitch jumps before smoothing. Keep their raw dots.
    frames = frames.map((frame, i) => {
        if (!frame.hz) return frame;
        const neighbors = frames.slice(Math.max(0, i - 4), i + 5).filter(f => f.hz).map(f => f.hz!).sort((a,b) => a-b);
        const median = neighbors[Math.floor(neighbors.length / 2)];
        const support = neighbors.filter(hz => Math.abs(12 * Math.log2(hz / frame.hz!)) < 3).length;
        return Math.abs(12 * Math.log2(frame.hz / median)) > 9 && support < 3 ? { ...frame, hz: null } : frame;
    });
    // Smooth contiguous voiced runs in log-frequency space; never interpolate across silence.
    return frames.map((f, i) => {
        if (!f.hz) return f;
        let weighted = 0, total = 0;
        for (let j = Math.max(0, i - 2); j <= Math.min(frames.length - 1, i + 2); j++) {
            if (!frames[j].hz || frames.slice(Math.min(i,j), Math.max(i,j) + 1).some(v => !v.hz)) continue;
            const weight = Math.exp(-((j - i) ** 2) / 2);
            weighted += Math.log2(frames[j].hz!) * weight; total += weight;
        }
        return { ...f, hz: 2 ** (weighted / total) };
    });
}
export function extractPitch(samples: Float32Array, rate: number): Frame[] {
    return cleanPitch(extractRawPitch(samples, rate));
}
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
function contourFit(values: number[], tone: number) {
    if (values.length < 5) return 0;
    const sampled = Array.from({ length: 13 }, (_, i) => {
        const position = i * (values.length - 1) / 12, left = Math.floor(position);
        return values[left] + (values[Math.min(left + 1, values.length - 1)] - values[left]) * (position - left);
    });
    const baseline = mean(sampled), centered = sampled.map(v => v - baseline);
    const shapes = [Array.from({ length: 13 }, (_, i) => {
        const t = i / 12;
        return tone === 1 ? 0 : tone === 2 ? 4 * t : tone === 3 ? -4 * Math.sin(Math.PI * t) : -6 * t;
    })];
    if (tone === 3) shapes.push(Array.from({ length: 13 }, (_, i) => -2 * i / 12));
    return Math.round(Math.max(...shapes.map(shape => {
        const center = mean(shape), template = shape.map(v => v - center);
        const energy = template.reduce((sum, v) => sum + v * v, 0);
        const gain = energy ? Math.max(.65, Math.min(1.5, centered.reduce((sum, v, i) => sum + v * template[i], 0) / energy)) : 1;
        const rmse = Math.sqrt(mean(centered.map((v, i) => (v - template[i] * gain) ** 2)));
        return clamp(100 - 32 * rmse);
    })));
}
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function scorePitch(frames: Frame[], tones: number[]): SyllableScore[] {
    if (!tones.length) return [];
    const active = frames.filter(f => f.rms > .01);
    const start = active[0]?.time ?? 0, end = (active.at(-1)?.time ?? frames.at(-1)?.time ?? 0) + .04;
    const cuts = [start];
    for (let i = 1; i < tones.length; i++) {
        const ideal = start + (end - start) * i / tones.length;
        const radius = (end - start) / tones.length * .22;
        const candidates = frames.filter(f => Math.abs(f.time - ideal) < radius);
        const cut = candidates.reduce<Frame | undefined>((a, b) => !a || b.rms + Math.abs(b.time - ideal) * .08 < a.rms + Math.abs(a.time - ideal) * .08 ? b : a, undefined);
        cuts.push(cut?.time ?? ideal);
    }
    cuts.push(end);
    return tones.map((expected, i) => {
        const segment = frames.filter(f => f.time >= cuts[i] && f.time < cuts[i + 1]);
        const voiced = segment.filter(f => f.hz !== null);
        const coverage = voiced.length / Math.max(1, segment.length);
        const values = voiced.map(f => 12 * Math.log2(f.hz!));
        const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
        const third = Math.max(1, Math.floor(values.length / 3));
        const first = mean(values.slice(0, third)), middle = mean(values.slice(third, -third)), last = mean(values.slice(-third));
        const delta = last - first, dip = (first + last) / 2 - middle;
        const span = values.length ? Math.max(...values) - Math.min(...values) : 0;
        const movementScores = values.length < 5 ? [0, 0, 0, 0] : [
            clamp(100 - Math.abs(delta) * 14 - span * 5),
            clamp(90 - Math.abs(delta - 4) * 13 - Math.max(0, dip - 2) * 5),
            Math.max(clamp(95 - Math.abs(dip - 3) * 16 - Math.abs(delta) * 5), clamp(78 - Math.abs(delta + 2) * 12)),
            clamp(95 - Math.abs(delta + 5) * 12 - Math.max(0, dip) * 10)
        ].map(Math.round);
        const contourScores = [1,2,3,4].map(tone => contourFit(values, tone));
        const scores = contourScores.map((fit, i) => Math.round(.47 * fit + .53 * movementScores[i]));
        const ranking = scores.map((score, j) => ({ score, tone: j + 1 })).sort((a, b) => b.score - a.score);
        const guess = values.length >= 5 ? ranking[0].tone : null;
        const margin = ranking[0].score - ranking[1].score;
        const flags: string[] = [];
        if (coverage < .45 || values.length < 5) flags.push('Sparse pitch');
        if (expected === 0 || expected === 5) flags.push('Neutral tone is not classified');
        else {
            if (margin < 12) flags.push('Close candidates');
            if (ranking[0].score < 65) flags.push('Weak fit');
            if (guess !== expected) flags.push('Pitch differs from key');
        }
        return { start: cuts[i], end: cuts[i + 1], expected: expected === 5 ? 0 : expected, guess, coverage, contourScores, movementScores, scores, margin, flags };
    });
}

export function summarizeScores(scores: SyllableScore[]) {
    const eligible = scores.filter(s => s.expected >= 1 && s.expected <= 4 && s.guess !== null && s.coverage >= .45);
    return {
        contour: eligible.length ? Math.round(mean(eligible.map(s => s.contourScores[s.expected - 1]))) : null,
        movement: eligible.length ? Math.round(mean(eligible.map(s => s.movementScores[s.expected - 1]))) : null,
        matched: eligible.filter(s => s.guess === s.expected).length,
        eligible: eligible.length,
        total: scores.filter(s => s.expected !== 0).length
    };
}
