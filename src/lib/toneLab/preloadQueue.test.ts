import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreloadQueue } from './preloadQueue';
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => resolve = r); return { promise, resolve }; };
afterEach(() => vi.restoreAllMocks());
describe('clear audio buffer', () => {
    it('keeps five ready clips, skips rejected audio, and refills after consumption', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(.99999);
        const load = vi.fn(async (key: string) => key === 'unclear' ? null : `audio:${key}`);
        const queue = new PreloadQueue(() => ['unclear', 'a', 'b', 'c', 'd', 'e', 'f', 'g'], load);
        queue.start();
        await vi.waitFor(() => expect(queue.size).toBe(5));
        expect(load).toHaveBeenCalledTimes(6);
        const first = await queue.take(); expect(first).toEqual({ key: 'a', value: 'audio:a' });
        await vi.waitFor(() => expect(queue.size).toBe(5));
        expect(load).toHaveBeenCalledTimes(7);
        expect((await queue.take()).key).toBe('b');
        queue.stop();
    });
    it('returns the first ready clip without waiting for the full buffer', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(.99999);
        const pending = deferred<string>();
        const queue = new PreloadQueue(() => ['a', 'b'], key => key === 'a' ? Promise.resolve('ready') : pending.promise);
        expect(await queue.take()).toEqual({ key: 'a', value: 'ready' });
        expect(queue.size).toBe(0);
        pending.resolve('later'); await vi.waitFor(() => expect(queue.size).toBe(1)); queue.stop();
    });
    it('cancels a pending consumer and ignores an old result after restarting', async () => {
        const old = deferred<string>(); let signal!: AbortSignal;
        const load = vi.fn((_key: string, current: AbortSignal) => { signal = current; return old.promise; });
        const queue = new PreloadQueue(() => ['a'], load);
        const taking = queue.take(); const cancelled = expect(taking).rejects.toMatchObject({ name: 'AbortError' });
        queue.stop(); expect(signal.aborted).toBe(true); await cancelled;
        load.mockImplementation(async () => 'new');
        queue.start(); await vi.waitFor(() => expect(queue.size).toBe(1));
        old.resolve('stale'); await Promise.resolve();
        expect(await queue.take()).toEqual({ key: 'a', value: 'new' }); queue.stop();
    });
    it('does not return duplicate candidates or a currently selected clip', async () => {
        const queue = new PreloadQueue(() => ['a', 'a', 'b', 'c'], async key => key);
        queue.start(); await vi.waitFor(() => expect(queue.size).toBe(3));
        const first = await queue.take('a'); const second = await queue.take('a');
        expect(new Set([first.key, second.key])).toEqual(new Set(['b', 'c'])); queue.stop();
    });
    it('ends a refill after repeated download failures and permits a retry', async () => {
        const load = vi.fn(async (_key: string): Promise<string | null> => { throw new Error('Offline'); });
        const queue = new PreloadQueue(() => ['a','b','c','d'], load);
        await expect(queue.take()).rejects.toThrow('Offline'); expect(load).toHaveBeenCalledTimes(3);
        load.mockImplementation(async key => key);
        expect((await queue.take()).value).toBeTruthy(); queue.stop();
    });
    it('reports exhaustion when no audio passes rather than returning an unclear clip', async () => {
        const queue = new PreloadQueue(() => ['a', 'b'], async () => null);
        await expect(queue.take()).rejects.toThrow('No clear clip found'); queue.stop();
    });
});
