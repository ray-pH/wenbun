<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import { base } from '$app/paths';
    import TopBar from '$lib/components/TopBar.svelte';
    import { getAudioUrl } from '$lib/chinese';
    import { spokenTones, ALGORITHM } from '$lib/toneLab/pitch';
    import type { Analysis } from '$lib/toneLab/signal';
    import SignalPlots from '$lib/toneLab/SignalPlots.svelte';
    import { DEFAULT_MINIMUM_SCORE, qualifiesForClearAudio } from '$lib/toneLab/clarity';
    import { AVOIDED_RECORDINGS } from '$lib/toneLab/avoidList';
    import { PreloadQueue } from '$lib/toneLab/preloadQueue';
    import { RuntimeAudio, type LoadedClip } from '$lib/toneLab/runtimeAudio';
    type Clip = { word: string; reading: string; tones: number[]; clear?: boolean; flags: string[] };
    let clips: Record<string, Clip> = {};
    let mode: 'listen' | 'speak' | 'explore' = 'listen';
    let clearOnly = true, syllableCount = 2;
    let minimumScore = DEFAULT_MINIMUM_SCORE;
    let advancedSettingsOpen = false;
    let selected = '', search = '', answers: number[] = [], revealed = false;
    let analysis: Analysis | null = null;
    const runtime = new RuntimeAudio();
    let currentAudio: LoadedClip | null = null;
    let playbackUrl = '';
    let audioQueue: PreloadQueue<LoadedClip>;
    let disposed = false;
    let error = '', loading = true, busy = false, playing = false;
    let prompt: string[] = [], target: number[] = [];
    let recording = false, elapsed = 0, replayUrl = '';
    let recorder: MediaRecorder | undefined, stream: MediaStream | undefined, timer: ReturnType<typeof setInterval> | undefined;
    let player: HTMLAudioElement | undefined;
    const version = ALGORITHM;
    const toneLabels = ['Neutral', 'High', 'Rising', 'Low / dipping', 'Falling'];
    const toneMarks = ['·', 'ˉ', 'ˊ', 'ˇ', 'ˋ'];
    $: clip = clips[selected];
    $: filtered = Object.entries(clips).filter(([path, c]) => (!clearOnly || c.clear !== false) && (c.word.includes(search) || c.reading.includes(search) || path.includes(search))).slice(0, 120);
    $: options = clip && !filtered.some(([path]) => path === selected) ? [[selected, clip] as [string, Clip], ...filtered] : filtered;
    $: expected = mode === 'speak' ? target : (clip?.tones ?? []);
    $: matchCount = answers.filter((tone, i) => tone === expected[i]).length;
    $: scores = analysis?.scores ?? [];
    onMount(async () => {
        try {
            const paths = ['audio_dict/zh_audio_dict.json', 'zh/zh_dict.json', 'zh/zh_cc_cedict_array.json'];
            const [index, dict, extra] = await Promise.all(paths.map(async path => {
                const response = await fetch(`${base}/wenbun-assets/${path}`);
                if (!response.ok) throw new Error('The audio library could not be loaded. Please try again.');
                return response.json();
            }));
            if (disposed) return;
            clips = Object.fromEntries(Object.entries(index as Record<string, string[]>).flatMap(([word, paths]) => {
                const reading: string = /^[a-züv:]+[1-5]$/i.test(word) ? word : dict[word]?.pinyin_num || extra[word]?.[1] || '';
                const tones = spokenTones([...reading.matchAll(/[1-5]/g)].map(m => Number(m[0]))).map(t => t === 5 ? 0 : t);
                const flags: string[] = [];
                if (!tones.length) flags.push('Missing tone key');
                if (/[一不]/.test(word)) flags.push('Sandhi needs review');
                if (/[/(),;]/.test(reading)) flags.push('Ambiguous tone key');
                return paths.filter(path => !AVOIDED_RECORDINGS.has(path)).map(path => [path, { word, reading, tones, flags }]);
            }));
            audioQueue = new PreloadQueue(
                () => Object.entries(clips).filter(([path, c]) => path !== selected && c.tones.length > 0 && c.tones.length <= 6 && (!clearOnly || (!c.flags.length && !c.tones.includes(0) && c.clear !== false))).map(([path]) => path),
                async (path, signal) => {
                    const audio = await loadClip(path, signal);
                    return !clearOnly || isClear(clips[path], audio.analysis) ? audio : null;
                },
            );
            await tick(); void next();
        } catch (e) { error = String(e instanceof Error ? e.message : e); }
        loading = false;
    });
    function displayReading(reading: string) {
        return reading.replace(/([a-züv:]+)([0-5])/gi, (_, raw: string, digit: string) => {
            const syllable = raw.replace(/u:|v/g, 'ü');
            const tone = Number(digit);
            if (!tone || tone === 5) return syllable;
            const vowels = [...syllable.matchAll(/[aeiouü]/gi)];
            const index = syllable.search(/a/i) >= 0 ? syllable.search(/a/i) : syllable.search(/e/i) >= 0 ? syllable.search(/e/i) : /ou/i.test(syllable) ? syllable.search(/o/i) : vowels.at(-1)?.index;
            if (index === undefined) return syllable;
            return (syllable.slice(0, index + 1) + ['', '\u0304', '\u0301', '\u030c', '\u0300'][tone] + syllable.slice(index + 1)).normalize('NFC');
        });
    }
    function reset() { stopPlayback(); if (playbackUrl) URL.revokeObjectURL(playbackUrl); playbackUrl = ''; currentAudio = null; analysis = null; answers = []; revealed = false; error = ''; if (replayUrl) URL.revokeObjectURL(replayUrl); replayUrl = ''; }
    async function next() {
        if (busy || recording) return;
        reset();
        if (mode === 'speak') {
            const syllables = ['mā', 'má', 'mǎ', 'mà', 'bā', 'bá', 'bǎ', 'bà', 'shī', 'shí', 'shǐ', 'shì', 'tā', 'tá', 'tǎ', 'tà'];
            prompt = Array.from({ length: syllableCount }, () => syllables[Math.floor(Math.random() * syllables.length)]);
            target = spokenTones(prompt.map(s => syllables.indexOf(s) % 4 + 1));
            // Keep written and spoken targets aligned, without adjacent third tones.
            for (let i = 0; i < target.length - 1; i++) if (target[i] === 2 && syllables.indexOf(prompt[i]) % 4 === 2) prompt[i] = syllables[syllables.indexOf(prompt[i]) - 1];
        } else {
            const previous = selected;
            selected = '';
            busy = true;
            try {
                const ready = await audioQueue.take(previous);
                if (disposed) return;
                selected = ready.key; currentAudio = ready.value; analysis = ready.value.analysis;
                if (mode === 'explore') revealed = true;
            } catch (e) { if (!disposed) error = e instanceof Error ? e.message : String(e); }
            finally { busy = false; }

        }
    }
    function updateQueue() { if (!audioQueue) return; if (mode !== 'speak') audioQueue.start(); else audioQueue.stop(); }
    function toggleClearOnly() {
        if (!clearOnly) advancedSettingsOpen = false;
        audioQueue?.stop();
        // Classification depends on the threshold; keep cached audio but reconsider its eligibility.
        for (const candidate of Object.values(clips)) candidate.clear = undefined;
        clips = clips;
        updateQueue(); void next();
    }
    function switchMode(value: typeof mode) { if (recording || busy) return; mode = value; updateQueue(); void next(); }
    function stopPlayback() { if (player) { player.onended = null; player.onerror = null; player.pause(); player.removeAttribute('src'); player.load(); player = undefined; } playing = false; }
    async function play(url: string) {
        stopPlayback(); error = '';
        player = new Audio(url); player.onended = () => playing = false;
        player.onerror = () => { playing = false; error = 'Audio could not be played. Check your connection or try another clip.'; };
        const activePlayer = player;
        try { await activePlayer.play(); if (player === activePlayer) playing = true; } catch { if (player === activePlayer) error = 'Audio could not be played. Try again or choose another clip.'; }
    }
    async function clipUrl(path = selected) {
        const url = await getAudioUrl('zh', path);
        return url.replace('https://github.com/ray-pH/wenbun-audio/raw/refs/heads/main/', 'https://raw.githubusercontent.com/ray-pH/wenbun-audio/refs/heads/main/');
    }
    async function playClip() {
        try {
            if (currentAudio) {
                if (!playbackUrl) playbackUrl = URL.createObjectURL(currentAudio.blob);
                await play(playbackUrl);
            } else await play(await clipUrl());
        } catch { error = 'Audio could not be loaded. Try another clip.'; }
    }
    function isClear(clip: Clip, result: Analysis) {
        return qualifiesForClearAudio(clip, result.scores, minimumScore);
    }
    async function loadClip(path: string, signal?: AbortSignal): Promise<LoadedClip> {
        if (AVOIDED_RECORDINGS.has(path)) throw new Error('This recording is excluded from Tone Lab.');
        const audio = await runtime.load(path, await clipUrl(path), clips[path].tones, signal);
        if (disposed || signal?.aborted) throw new DOMException('Loading cancelled', 'AbortError');
        clips[path].clear = isClear(clips[path], audio.analysis); clips = clips;
        return audio;
    }
    async function reveal() {
        if (!clip || busy) return;
        revealed = true; busy = true; error = '';
        try { currentAudio ??= await loadClip(selected); analysis = currentAudio.analysis; }
        catch { error = 'The audio could not be analyzed. Please try again or choose another clip.'; }
        finally { busy = false; }
    }
    function releaseMic() { stream?.getTracks().forEach(t => t.stop()); stream = undefined; if (timer) clearInterval(timer); timer = undefined; }
    async function record() {
        error = ''; stopPlayback();
        try {
            if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Recording needs a supported browser on HTTPS or localhost.');
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
            recorder = new MediaRecorder(stream); const chunks: Blob[] = [];
            recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
            recorder.onstop = async () => {
                releaseMic(); recording = false; busy = true;
                const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
                if (replayUrl) URL.revokeObjectURL(replayUrl); replayUrl = URL.createObjectURL(blob);
                try { analysis = await runtime.analyze(blob, target); revealed = true; } catch { error = 'This recording could not be analyzed. Please record another take.'; } finally { busy = false; }
            };
            recorder.onerror = () => { error = 'Recording failed. Please try again.'; releaseMic(); recording = false; busy = false; };
            recorder.start(); recording = true; elapsed = 0; analysis = null; revealed = false;
            timer = setInterval(() => { elapsed++; if (elapsed >= 15) stopRecording(); }, 1000);
        } catch (e) { releaseMic(); error = e instanceof Error && e.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in your browser settings and try again.' : String(e instanceof Error ? e.message : e); }
    }
    function stopRecording() { if (recorder?.state === 'recording') { busy = true; recorder.stop(); } releaseMic(); recording = false; }
    onDestroy(() => {
        disposed = true; audioQueue?.stop(); runtime.dispose();
        if (recorder?.state === 'recording') { recorder.onstop = null; recorder.stop(); }
        releaseMic(); stopPlayback();
        if (replayUrl) URL.revokeObjectURL(replayUrl);
        if (playbackUrl) URL.revokeObjectURL(playbackUrl);
    });
</script>

<svelte:head><title>Tone Lab · WenBun</title></svelte:head>
<TopBar title="Tone Lab" backUrl={`${base}/toys/`} />
<main>
    <header><span class="eyebrow"><i class="fa-solid fa-wave-square"></i> WENBUN TOYS</span><h1>Find your tone.</h1><p>Listen closely. Try it out loud. See the shape of your voice.</p></header>
    <nav aria-label="Tone Lab mode">{#each [['listen', 'Listening quiz', 'fa-headphones'], ['speak', 'Speaking quiz', 'fa-microphone'], ['explore', 'Explore audio', 'fa-chart-line']] as [value, label, icon]}<button class:active={mode === value} disabled={recording || busy} onclick={() => switchMode(value as typeof mode)}><i class={`fa-solid ${icon}`}></i> {label}</button>{/each}</nav>
    {#if loading}<section class="card"><p>Loading the audio library…</p></section>
    {:else}
    <div class="workspace">
    <section class="card practice">
        <div class="section-heading"><h2>{mode === 'speak' ? 'Your turn to speak' : mode === 'listen' ? 'What tones do you hear?' : 'Inside the recording'}</h2>{#if mode === 'speak'}<span class="badge">1–6 syllables</span>{/if}</div>
        {#if mode === 'speak'}
            <label class="config">Syllables <select bind:value={syllableCount} onchange={next} disabled={recording || busy}>{#each [1,2,3,4,5,6] as n}<option value={n}>{n}</option>{/each}</select></label>
            <div class="prompt">{prompt.join(' ')}</div><p class="hint">Read the pinyin, then record up to 15 seconds.</p>
            <div class="actions"><button class="button" class:recording onclick={recording ? stopRecording : record} disabled={busy}>{recording ? `Stop · ${elapsed}s` : 'Record voice'}</button>{#if replayUrl}<button class="button invert" onclick={() => play(replayUrl)}>Replay my take</button>{/if}<button class="button invert" disabled={recording || busy} onclick={next}>New prompt</button></div>
        {:else}
            <div class="filter-settings"><label class="toggle"><input type="checkbox" bind:checked={clearOnly} onchange={toggleClearOnly} disabled={busy} /> Clear clips only <span title="Require tone agreement, enough usable pitch, distinct candidates, and the minimum score for every syllable.">ⓘ</span></label>{#if clearOnly}<button class="advanced-settings-toggle" aria-label="Advanced settings" title="Advanced settings" aria-expanded={advancedSettingsOpen} aria-controls="tone-lab-advanced-settings" onclick={() => advancedSettingsOpen = !advancedSettingsOpen}><span class="advanced-settings-label">Advanced settings</span></button>{/if}</div>
            {#if clearOnly && advancedSettingsOpen}<div id="tone-lab-advanced-settings"><label class="config score-threshold">Minimum score <select aria-label="Minimum clear clip score" bind:value={minimumScore} onchange={toggleClearOnly} disabled={busy || !clearOnly}>{#each [40,50,60,65,70,80,90] as floor}<option value={floor}>{floor}/100</option>{/each}</select><span>per syllable</span></label></div>{/if}
            {#if mode === 'explore'}<label class="search">Find audio<input placeholder="Chinese, pinyin, or source…" bind:value={search} /></label><select aria-label="Recording" disabled={busy} bind:value={selected} onchange={() => { reset(); void reveal(); }}>{#each options as [path, c]}<option value={path}>{c.word} · {c.reading} · {path.split('/').slice(-2).join('/')}</option>{/each}</select><small>Search by Chinese, pinyin, or source.</small>{/if}
            {#if clip}<div class="prompt">{mode === 'listen' && !revealed ? '？' : displayReading(clip.word)}</div><p class="hint">{mode === 'listen' && !revealed ? `${clip.tones.length} syllable${clip.tones.length === 1 ? '' : 's'} · listen before revealing the word` : clip.word === clip.reading ? 'Single syllable' : displayReading(clip.reading)}</p>
            <div class="actions"><button class="button" onclick={() => playClip()}><i class="fa-solid fa-volume-high"></i>&nbsp; {playing ? 'Play again' : 'Play audio'}</button><button class="button invert" onclick={next} disabled={busy}>{mode === 'explore' ? 'Random clip' : 'Next clip'}</button></div>
            {#if mode === 'listen'}<div class="answers">{#each clip.tones as tone, i}<fieldset disabled={revealed || busy}><legend>Syllable {i + 1}</legend><div class="tone-choices">{#each [1,2,3,4,0] as n}<button class:chosen={answers[i] === n} aria-pressed={answers[i] === n} aria-label={`Syllable ${i + 1}: tone ${n}, ${toneLabels[n]}`} onclick={() => { answers[i] = n; answers = [...answers]; }}><svg class="tone-symbol" viewBox="0 0 32 20" aria-hidden="true">{#if n === 0}<circle cx="16" cy="10" r="2" />{:else}<path d={n === 1 ? 'M7 10H25' : n === 2 ? 'M9 14L23 6' : n === 3 ? 'M7 6L16 14L25 6' : 'M9 6L23 14'} />{/if}</svg><span>{n}</span></button>{/each}</div>{#if revealed}<p class="key" class:correct={answers[i] === tone}>{answers[i] === tone ? '✓' : '×'} Key: {tone}</p>{/if}</fieldset>{/each}</div>
            <button class="button check" onclick={reveal} disabled={revealed || busy || clip.tones.some((_, i) => answers[i] === undefined)}>Check tones</button>{#if revealed}<p role="status">{matchCount} / {expected.length} tones matched the key.</p>{/if}{/if}
            {:else if busy}<p>Loading candidate audio…</p>{:else}<p>No clips match this filter. Try another clip or turn off “Clear clips only” to explore the library.</p><button class="button invert" onclick={next} disabled={busy}>Try another clip</button>{/if}
        {/if}
    </section>
    <aside class="card guide"><h2>A quick ear guide</h2>{#each [1,2,3,4,0] as n}<div class="guide-row"><b class={`tone-${n}`}>{toneMarks[n]}</b><span><strong>{n} · {toneLabels[n]}</strong><small>{['Light and short', 'Hold it steady', 'Let it climb', 'Drop low, then rise', 'Let it fall'][n]}</small></span></div>{/each}<p class="note">Natural speech bends the shapes. A third tone often stays low; before another third tone it becomes a rising tone.</p></aside>
    </div>
    {/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if busy}<p role="status">Analyzing pitch…</p>{/if}
    {#if revealed}
    <section class="card evidence"><div class="section-heading"><h2>Pitch evidence</h2><span class="badge">Experimental</span></div>
        {#if analysis}<SignalPlots {analysis} />{/if}
        <p class="note">Pitch similarity is a clue, not a pronunciation grade. It cannot tell whether you said the prompted syllable. Boundaries are estimated; neutral tone is not classified.</p>
        <div class="table-wrap"><table><thead><tr><th>Syllable</th><th>Key</th><th>Pitch guess</th><th>Coverage</th><th>Candidate scores · 1 / 2 / 3 / 4</th><th>Notes</th></tr></thead><tbody>{#each scores as s, i}<tr><td>{i + 1}<small>{s.start.toFixed(2)}–{s.end.toFixed(2)}s</small></td><td>{s.expected}</td><td>{s.guess ?? '—'}</td><td>{Math.round(s.coverage * 100)}%</td><td><span class="candidate-scores">{#each s.scores as candidate, tone}{#if tone > 0}<span aria-hidden="true">{' / '}</span>{/if}<span class:highest={s.guess !== null && candidate === Math.max(...s.scores)} title={`Tone ${tone + 1}${s.guess !== null && candidate === Math.max(...s.scores) ? ' · highest score' : ''}`}>{candidate}</span>{/each}</span><small>Top-two margin: {s.margin}</small></td><td>{s.flags.join(' · ') || 'Clear pitch'}</td></tr>{/each}</tbody></table></div>
        {#if mode !== 'speak' && clip}<details><summary>Recording & runtime analysis</summary><p>{selected}</p><p>{analysis ? [...clip.flags, ...new Set(scores.flatMap(s => s.flags))].join(' · ') || 'Passed runtime clarity checks' : 'Analysis unavailable'} · {version}</p><p>Audio: Hugolpz / audio-cmn and Lingua Libre contributors, via <a href="https://github.com/ray-pH/wenbun-audio">Wenbun Audio</a>.</p></details>{/if}
    </section>{/if}
    <footer>Just a little experiment. Calculated here, as you play.<br />Recordings stay in this browser and are released when you leave.</footer>
</main>

<style>
main { max-width: 66rem; margin: 2rem auto; padding: 0 1rem 3rem; } header { margin-bottom: 2rem; } .eyebrow { color: var(--wenbun-blue); font-size: .8rem; font-weight: 700; letter-spacing: .12em; } h1 { font-size: clamp(2rem, 5vw, 2.8rem); margin: .6rem 0; } header p, .hint, .note, footer { color: var(--theme-muted, #555); line-height: 1.7; } nav { display: flex; gap: .5rem; margin-bottom: 1rem; flex-wrap: wrap; } button, select, input { font: inherit; } button { cursor: pointer; } nav button { border: 1px solid var(--theme-border, #0002); background: var(--theme-surface, #ffffff90); color: inherit; border-radius: .5rem; padding: .85rem 1rem; } nav button.active { color: var(--theme-on-blue, white); background: var(--wenbun-blue); border-color: var(--wenbun-blue); } .workspace { display: grid; grid-template-columns: minmax(0, 1fr) 17rem; gap: 1rem; align-items: start; } .card { background: var(--theme-surface, #ffffff90); border-radius: .5rem; padding: 1.5rem; min-width: 0; } h2 { font-size: 1.1rem; margin: 0; } .section-heading { display: flex; gap: .75rem; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 1.5rem; } .badge { color: var(--wenbun-blue); font-size: .8rem; border: 1px solid var(--theme-border, #0002); border-radius: 1rem; padding: .3rem .65rem; } .filter-settings { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem .75rem; } .advanced-settings-toggle { border: 0; background: transparent; color: var(--theme-muted, #777); padding: .2rem 0; font-size: .8rem; cursor: pointer; text-decoration: underline; text-underline-offset: .15em; } .advanced-settings-toggle:hover { opacity: .8; } .toggle, .config { display: flex; align-items: center; gap: .5rem; font-size: .9rem; } .toggle input { accent-color: var(--wenbun-blue); width: 1.1rem; height: 1.1rem; } .prompt { text-align: center; font-size: clamp(2rem, 5vw, 3rem); margin: 2rem 0 .5rem; overflow-wrap: anywhere; } .hint { text-align: center; font-size: .9rem; } .actions { display: flex; justify-content: center; gap: .6rem; flex-wrap: wrap; margin: 1.5rem 0; } .button { min-height: 1.6rem; } .recording { background: var(--wenbun-red); } .answers { display: grid; grid-template-columns: repeat(auto-fit, minmax(215px, 1fr)); gap: 1rem; margin: 2rem 0 1rem; } fieldset { border: 0; padding: 0; min-width: 0; } legend { font-size: .85rem; color: var(--theme-muted, #555); margin-bottom: .5rem; } .tone-choices { display: flex; gap: .35rem; } .tone-choices button { flex: 1; background: transparent; color: inherit; border: 1px solid var(--theme-border, #0003); border-radius: .4rem; min-height: 3.3rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .2rem; } .tone-symbol { width: 2rem; height: 1.25rem; display: block; flex-shrink: 0; overflow: visible; } .tone-symbol path { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; } .tone-symbol circle { fill: currentColor; } .tone-choices span { font-size: .8rem; } .tone-choices .chosen { border-color: var(--wenbun-blue); color: var(--wenbun-blue); background: var(--theme-surface-alt, #3e92cc18); box-shadow: inset 0 0 0 1px var(--wenbun-blue); } .check { margin-top: 1.5rem; } .key { color: var(--wenbun-red); } .key.correct { color: var(--wenbun-green); } .guide-row { display: flex; gap: 1rem; align-items: center; margin-top: 1.2rem; } .guide-row b { width: 2rem; font-size: 2rem; color: var(--wenbun-blue); text-align: center; } small { display: block; font-size: .8rem; color: var(--theme-muted, #555); margin-top: .25rem; } .guide .note { font-size: .85rem; margin: 1.5rem 0 0; } .evidence { margin-top: 1rem; } .note { font-size: .9rem; } .candidate-scores { white-space: nowrap; } .candidate-scores .highest { font-weight: 700; color: var(--wenbun-blue); background: color-mix(in srgb, var(--wenbun-blue) 12%, transparent); border-radius: .25rem; padding: .1rem .3rem; } .table-wrap { overflow-x: auto; } table { width: 100%; border-collapse: collapse; font-size: .85rem; text-align: left; } th, td { padding: .8rem .6rem; border-bottom: 1px solid var(--theme-border, #0002); } th { white-space: nowrap; } details { margin-top: 1.5rem; font-size: .85rem; overflow-wrap: anywhere; } summary { cursor: pointer; } a { color: var(--wenbun-blue); } footer { text-align: center; font-size: .8rem; margin-top: 2rem; } .error { color: var(--wenbun-red); padding: 1rem; background: var(--theme-surface, #fff9); border-radius: .5rem; } .search { display: block; margin: 1rem 0; } input:not([type=checkbox]), select { box-sizing: border-box; border: 1px solid var(--theme-border, #0003); border-radius: .4rem; background: var(--theme-surface, #fff); color: inherit; padding: .6rem; max-width: 100%; } .search input { display: block; width: 100%; margin-top: .5rem; } .config select { width: 5rem; } .score-threshold { margin-top: .75rem; flex-wrap: wrap; color: var(--theme-muted, #555); } .score-threshold select { width: 6.5rem; } .score-threshold span { font-size: .8rem; } button:focus-visible, a:focus-visible { outline: 3px solid var(--wenbun-orange); outline-offset: 3px; } button:disabled { cursor: default; opacity: .5; } @media (max-width: 760px) { main { margin-top: 1.5rem; } .workspace { grid-template-columns: 1fr; } .card { padding: 1.1rem; } nav { display: grid; grid-template-columns: 1fr 1fr; } nav button { padding: .8rem .4rem; font-size: .85rem; } nav button:last-child { grid-column: 1 / -1; } .guide { display: none; } .prompt { margin-top: 1.5rem; } }
</style>
