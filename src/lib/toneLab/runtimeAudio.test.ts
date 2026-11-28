import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuntimeAudio } from './runtimeAudio';
const workers: FakeWorker[] = [];
class FakeWorker {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    terminate = vi.fn(); postMessage = vi.fn();
    constructor() { workers.push(this); }
    complete(result: unknown) { this.onmessage?.({ data: { result } }); }
}
beforeEach(() => {
    workers.length = 0;
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('AudioContext', class {
        decodeAudioData = async () => ({ length: 8, numberOfChannels: 1, sampleRate: 8000, getChannelData: () => new Float32Array(8) });
        close = async () => {};
    });
});
afterEach(() => vi.unstubAllGlobals());
describe('independent audio jobs', () => {
    it('keeps background and foreground results separate when they complete out of order', async () => {
        const runtime = new RuntimeAudio(), blob = new Blob(['audio']);
        const background = runtime.analyze(blob, [2]), foreground = runtime.analyze(blob, [4]);
        await vi.waitFor(() => expect(workers).toHaveLength(2));
        workers[1].complete({ id: 'foreground' }); expect(await foreground).toEqual({ id: 'foreground' });
        workers[0].complete({ id: 'background' }); expect(await background).toEqual({ id: 'background' });
        expect(workers.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true); runtime.dispose();
    });
    it('retains the downloaded audio with its analysis for instant replay without another fetch', async () => {
        const blob = new Blob(['audio']); const fetch = vi.fn(async () => ({ ok: true, blob: async () => blob })); vi.stubGlobal('fetch', fetch);
        const runtime = new RuntimeAudio(); const loading = runtime.load('a', '/audio/a', [1]);
        await vi.waitFor(() => expect(workers).toHaveLength(1)); workers[0].complete({ id: 'analysis' });
        const loaded = await loading; expect(loaded.blob).toBe(blob);
        expect(await runtime.load('a', '/audio/a', [1])).toBe(loaded); expect(fetch).toHaveBeenCalledTimes(1); runtime.dispose();
    });
    it('stops only the cancelled worker, leaving foreground work active', async () => {
        const runtime = new RuntimeAudio(), controller = new AbortController(), blob = new Blob(['audio']);
        const background = runtime.analyze(blob, [2], controller.signal), foreground = runtime.analyze(blob, [4]);
        const rejection = expect(background).rejects.toMatchObject({ name: 'AbortError' });
        await vi.waitFor(() => expect(workers).toHaveLength(2)); controller.abort(); await rejection;
        expect(workers[0].terminate).toHaveBeenCalledOnce(); expect(workers[1].terminate).not.toHaveBeenCalled();
        workers[1].complete({ id: 'active' }); expect(await foreground).toEqual({ id: 'active' }); runtime.dispose();
    });
});
