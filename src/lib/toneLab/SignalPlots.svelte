<script lang="ts">
    import type { Analysis } from './signal';
    export let analysis: Analysis;
    let view: 'Overlay' | 'Raw' | 'Clean' | 'Relative' = 'Overlay';
    let canvas: HTMLCanvasElement;
    $: relative = view === 'Relative';
    $: rawValues = analysis.raw.filter(f => f.hz).map(f => f.hz!);
    $: relativeValues = analysis.clean.filter(f => f.hz).map(f => 12 * Math.log2(f.hz! / (analysis.median || 1)));
    $: minimum = relative ? Math.floor(Math.min(-4, ...relativeValues) / 2) * 2 : Math.max(0, Math.floor(Math.min(...rawValues, analysis.min ?? 60) / 50) * 50 - 50);
    $: maximum = relative ? Math.ceil(Math.max(4, ...relativeValues) / 2) * 2 : Math.ceil(Math.max(...rawValues, analysis.max ?? 400) / 50) * 50 + 50;
    const x = (time: number, duration: number) => 64 + time / Math.max(duration, .001) * 770;
    $: y = (hz: number) => 222 - ((relative ? 12 * Math.log2(hz / (analysis.median || 1)) : hz) - minimum) / (maximum - minimum) * 200;
    // Interpolate between measured clean points with a monotone cubic Hermite curve.
    // Tangents are limited to avoid creating extra peaks or overshoot.
    function smoothPath(points: { x: number; y: number }[]) {
        if (!points.length) return '';
        let path = `M${points[0].x},${points[0].y}`;
        const slopes = points.slice(1).map((p, i) => (p.y - points[i].y) / (p.x - points[i].x));
        const tangents = points.map((_, i) => i === 0 ? slopes[0] || 0 : i === points.length - 1 ? slopes[i - 1] || 0 : slopes[i - 1] * slopes[i] <= 0 ? 0 : 2 / (1 / slopes[i - 1] + 1 / slopes[i]));
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1], b = points[i], dx = (b.x - a.x) / 3;
            path += ` C${a.x + dx},${a.y + tangents[i - 1] * dx} ${b.x - dx},${b.y - tangents[i] * dx} ${b.x},${b.y}`;
        }
        return path;
    }
    $: runs = analysis.clean.reduce<{ x: number; y: number }[][]>((runs, frame, i) => {
        if (frame.hz) {
            if (!i || !analysis.clean[i - 1].hz) runs.push([]);
            runs[runs.length - 1].push({ x: x(frame.time, analysis.duration), y: y(frame.hz) });
        }
        return runs;
    }, []);
    $: contourPaths = runs.map(smoothPath);
    $: waveformPath = analysis.waveform.map((v, i, all) => `M${64 + i / Math.max(1, all.length - 1) * 770},${122 - v.max * 95} L${64 + i / Math.max(1, all.length - 1) * 770},${122 - v.min * 95}`).join(' ');
    $: if (canvas && analysis) drawSpectrum(canvas, analysis);
    function drawSpectrum(canvas: HTMLCanvasElement, data: Analysis) {
        const { columns, bins, db } = data.spectrogram;
        canvas.width = columns; canvas.height = bins;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        const image = ctx.createImageData(columns, bins);
        const stops = [[12,17,32], [29,48,89], [32,113,165], [62,169,192], [199,223,121], [255,236,169]];
        for (let col = 0; col < columns; col++) for (let bin = 0; bin < bins; bin++) {
            const level = Math.max(0, Math.min(1, (db[col * bins + bin] + 85) / 85)) * (stops.length - 1);
            const a = Math.min(stops.length - 2, Math.floor(level)), blend = level - a;
            const offset = ((bins - 1 - bin) * columns + col) * 4;
            for (let c = 0; c < 3; c++) image.data[offset + c] = stops[a][c] * (1 - blend) + stops[a + 1][c] * blend;
            image.data[offset + 3] = 255;
        }
        ctx.putImageData(image, 0, 0);
    }
</script>
<div class="stats">
    <div><span>Contour fit</span><strong>{analysis.summary.contour === null ? '—' : `${analysis.summary.contour}/100`}</strong><small>Expected tone shape</small></div>
    <div><span>Pitch movement</span><strong>{analysis.summary.movement === null ? '—' : `${analysis.summary.movement}/100`}</strong><small>Rise, fall, span, and dip</small></div>
    <div><span>Tone agreement</span><strong>{analysis.summary.eligible ? `${analysis.summary.matched}/${analysis.summary.eligible}` : '—'}</strong><small>{analysis.summary.eligible} of {analysis.summary.total} non-neutral syllables usable</small></div>
</div>
<div class="metadata"><span>Duration <b>{analysis.duration.toFixed(2)} s</b></span><span>Median pitch <b>{analysis.median ? `${Math.round(analysis.median)} Hz` : '—'}</b></span><span>Pitch range <b>{analysis.min ? `${Math.round(analysis.min)}–${Math.round(analysis.max!)} Hz` : '—'}</b></span></div>
<section class="plot-panel">
    <div class="heading"><div><h3>Pitch contour</h3><p>{view === 'Overlay' ? 'Raw estimates overlaid with the smoothed contour.' : view === 'Raw' ? 'Individual pitch estimates, before cleaning.' : view === 'Clean' ? 'Smoothed pitch with uncertain gaps preserved.' : 'Clean pitch relative to the median, in semitones.'}</p></div><div class="views" aria-label="Pitch view">{#each ['Overlay', 'Raw', 'Clean', 'Relative'] as option}<button aria-pressed={view === option} class:active={view === option} onclick={() => view = option as typeof view}>{option}</button>{/each}</div></div>
    <div class="chart-scroll"><svg viewBox="0 0 860 260" role="img" aria-label={`${view} pitch contour over time`}><text x="20" y="15">{relative ? 'st' : 'Hz'}</text>
        {#each [0,1,2,3,4] as n}<line x1="64" y1={22 + n * 50} x2="834" y2={22 + n * 50} class="grid"/><text x="57" y={26 + n * 50} text-anchor="end">{Math.round(maximum - n / 4 * (maximum - minimum))}</text>{/each}
        {#each [0,1,2,3,4,5,6] as n}<line x1={64 + n / 6 * 770} y1="22" x2={64 + n / 6 * 770} y2="222" class="grid"/><text x={64 + n / 6 * 770} y="246" text-anchor="middle">{(analysis.duration * n / 6).toFixed(2)} s</text>{/each}
        {#each analysis.scores as score}<line x1={x(score.start, analysis.duration)} y1="22" x2={x(score.start, analysis.duration)} y2="222" class="boundary"/>{/each}
        {#if view === 'Raw' || view === 'Overlay'}{#each analysis.raw as f}{#if f.hz}<circle cx={x(f.time, analysis.duration)} cy={y(f.hz)} r="2" opacity={Math.max(.2, f.periodicity * .65)} fill="var(--wenbun-green)"/>{/if}{/each}{/if}
        {#if view !== 'Raw'}{#each contourPaths as d}<path {d} fill="none" stroke="var(--wenbun-blue)" stroke-width="2.5" stroke-linecap="round"/>{/each}{/if}
    </svg></div>
    <div class="legend">{#if view === 'Overlay' || view === 'Raw'}<span class="raw">● Raw F0</span>{/if}{#if view !== 'Raw'}<span class="clean">━ {relative ? 'Relative pitch' : 'Clean F0'}</span>{/if}<span>Dashed lines: estimated syllable starts</span></div>
</section>
<div class="signal-grid">
    <section class="plot-panel"><h3>Waveform</h3><p>Amplitude shows speech, pauses, and quiet syllables.</p><div class="chart-scroll"><svg viewBox="0 0 860 260" role="img" aria-label="Audio waveform amplitude over time">{#each [0,1,2] as n}<line x1="64" y1={27 + n * 95} x2="834" y2={27 + n * 95} class="grid"/><text x="55" y={31 + n * 95} text-anchor="end">{1 - n}</text>{/each}{#each [0,1,2,3,4] as n}<text x={64 + n / 4 * 770} y="246" text-anchor="middle">{(analysis.duration * n / 4).toFixed(2)} s</text>{/each}<path d={waveformPath} stroke="var(--wenbun-blue)" stroke-width="1"/></svg></div></section>
    <section class="plot-panel"><h3>Spectrogram</h3><p>Brighter bands show stronger frequencies and harmonics.</p><div class="spectrum"><div class="frequency">{#each [4,3,2,1,0] as n}<span>{n} kHz</span>{/each}</div><canvas bind:this={canvas} aria-label="Spectrogram showing audio energy from zero to four kilohertz over time">Audio energy from 0–4 kHz; brighter bands indicate stronger frequencies.</canvas></div><div class="spectrum-times">{#each [0,1,2,3,4] as n}<span>{(analysis.duration * n / 4).toFixed(2)} s</span>{/each}</div><small>512-sample Hann window · 8 kHz · −85 to 0 dBFS</small></section>
</div>
<details><summary>How the plots and scores work</summary><p>Contour fit compares 13 points with tone templates, allowing pitch baseline and limited scale differences. Pitch movement measures the start-to-end change, span, and dip; tone 3 can dip and rise or stay low and fall. Candidate scores combine 47% contour fit and 53% movement. Tone agreement counts top guesses matching the spoken key among syllables with enough clean pitch. Neutral tones are excluded.</p><p>Raw pitch comes from a YIN-style estimator. Clean removes weak estimates, corrects isolated octave errors, and smooths voiced runs. Curves interpolate between clean points without bridging gaps. Relative pitch is 12 × log₂(F0 / median F0). Waveform and spectrogram use the same decoded audio. Everything is calculated in this browser; scores are never written to assets.</p></details>
<style>
.stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1rem; margin-bottom:1.5rem; } .stats>div { padding:1rem; border:1px solid color-mix(in srgb,var(--theme-text,#222) 14%,transparent); border-radius:.5rem; } .stats span, small { display:block; color:var(--theme-muted,#555); font-size:.85rem; } .stats strong { display:block; font-size:1.65rem; margin:.4rem 0; color:var(--wenbun-blue); } .metadata { display:flex; flex-wrap:wrap; gap:1.5rem; margin-bottom:1.5rem; font-size:.85rem; color:var(--theme-muted,#555); } .metadata b { color:var(--theme-text,#222); margin-left:.5rem; } h3 { margin:0; font-size:1rem; } p { font-size:.9rem; color:var(--theme-muted,#555); line-height:1.6; margin:.4rem 0 1rem; } .heading { display:flex; justify-content:space-between; align-items:start; gap:1rem; flex-wrap:wrap; } .views { display:flex; background:var(--theme-surface-alt,#3e92cc15); border-radius:.5rem; padding:.25rem; } button { border:0; padding:.5rem .6rem; font:inherit; font-size:.85rem; border-radius:.35rem; cursor:pointer; color:inherit; background:transparent; } button.active { background:var(--theme-surface,#fff); color:var(--wenbun-blue); font-weight:700; box-shadow:0 1px 3px #0002; } button:focus-visible { outline:2px solid var(--wenbun-orange); } .plot-panel { min-width:0; padding:1rem; border:1px solid color-mix(in srgb,var(--theme-text,#222) 14%,transparent); border-radius:.5rem; } .chart-scroll { overflow-x:auto; } svg { display:block; width:100%; min-width:420px; } svg text { font-size:12px; fill:var(--theme-muted,#555); } .grid { stroke:var(--theme-text,#222); opacity:.12; } .boundary { stroke:var(--wenbun-orange); opacity:.45; stroke-dasharray:4 5; } .legend { display:flex; gap:1rem; flex-wrap:wrap; font-size:.8rem; color:var(--theme-muted,#555); margin-top:.5rem; } .raw { color:var(--wenbun-green); } .clean { color:var(--wenbun-blue); } .signal-grid svg text { font-size:20px; } .signal-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin:1rem 0; } .spectrum { display:flex; height:155px; gap:.5rem; } .frequency { display:flex; flex-direction:column; justify-content:space-between; white-space:nowrap; font-size:.75rem; color:var(--theme-muted,#555); } canvas { width:calc(100% - 3rem); flex:1; min-width:0; height:100%; border-radius:.2rem; } .spectrum-times { display:flex; justify-content:space-between; font-size:.7rem; color:var(--theme-muted,#555); margin:.4rem 0 .5rem 3rem; } details { font-size:.85rem; margin:1rem 0; } summary { cursor:pointer; font-weight:600; } @media(max-width:760px) { svg text, .signal-grid svg text { font-size:24px; } .stats { gap:.5rem; } .stats>div { padding:.75rem .5rem; } .stats strong { font-size:1.3rem; } .stats small { font-size:.75rem; } .signal-grid { grid-template-columns:1fr; } .plot-panel { padding:.75rem; } }
</style>
