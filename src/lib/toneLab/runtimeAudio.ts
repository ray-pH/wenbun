import type { Analysis } from './signal';
export type LoadedClip = { blob: Blob; analysis: Analysis };
/** Independent jobs let background preloading and foreground recordings coexist safely. */
export class RuntimeAudio {
    private context: AudioContext | undefined;
    private jobs = new Map<Worker, () => void>();
    private requests = new Set<AbortController>();
    private cache = new Map<string, LoadedClip>();
    private disposed = false;
    async analyze(blob: Blob, tones: number[], signal?: AbortSignal): Promise<Analysis> {
        if (this.disposed || signal?.aborted) throw new DOMException('Analysis cancelled', 'AbortError');
        this.context ??= new AudioContext();
        const buffer = await this.context.decodeAudioData(await blob.arrayBuffer());
        if (this.disposed || signal?.aborted) throw new DOMException('Analysis cancelled', 'AbortError');
        const samples = new Float32Array(buffer.length);
        for (let c = 0; c < buffer.numberOfChannels; c++) {
            const channel = buffer.getChannelData(c);
            for (let i = 0; i < samples.length; i++) samples[i] += channel[i] / buffer.numberOfChannels;
        }
        return new Promise((resolve, reject) => {
            const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
            const finish = () => { worker.terminate(); this.jobs.delete(worker); signal?.removeEventListener('abort', cancel); };
            const cancel = () => { finish(); reject(new DOMException('Analysis cancelled', 'AbortError')); };
            this.jobs.set(worker, cancel);
            signal?.addEventListener('abort', cancel, { once: true });
            worker.onmessage = event => { finish(); if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data.result); };
            worker.onerror = () => { finish(); reject(new Error('Audio analysis failed. Please try another clip.')); };
            worker.postMessage({ samples, rate: buffer.sampleRate, tones }, [samples.buffer]);
        });
    }
    async load(key: string, url: string, tones: number[], signal?: AbortSignal): Promise<LoadedClip> {
        if (this.disposed || signal?.aborted) throw new DOMException('Loading cancelled', 'AbortError');
        const cached = this.cache.get(key);
        if (cached) return cached;
        const controller = new AbortController();
        const cancel = () => controller.abort();
        signal?.addEventListener('abort', cancel, { once: true });
        this.requests.add(controller);
        const timeout = setTimeout(cancel, 20000);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error('The audio could not be downloaded.');
            const blob = await response.blob();
            clearTimeout(timeout);
            const analysis = await this.analyze(blob, tones, controller.signal);
            const result = { blob, analysis };
            this.cache.set(key, result);
            if (this.cache.size > 12) this.cache.delete(this.cache.keys().next().value!);
            return result;
        } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); this.requests.delete(controller); }
    }
    dispose() {
        this.disposed = true;
        for (const controller of this.requests) controller.abort();
        for (const cancel of [...this.jobs.values()]) cancel();
        this.cache.clear(); void this.context?.close();
    }
}
