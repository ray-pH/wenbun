/** A bounded, cancellable queue. Consumers get the first ready clip while filling continues. */
export class PreloadQueue<T> {
    private ready: { key: string; value: T }[] = [];
    private attempted = new Set<string>();
    private controller: AbortController | undefined;
    private filling = false;
    private listeners = new Set<() => void>();
    private failure: Error | undefined;
    constructor(
        private candidates: () => string[],
        private load: (key: string, signal: AbortSignal) => Promise<T | null>,
        readonly capacity = 5,
    ) {}
    get size() { return this.ready.length; }
    start() {
        if (!this.controller) this.controller = new AbortController();
        void this.fill();
    }
    stop() {
        this.controller?.abort(); this.controller = undefined;
        this.ready = []; this.attempted.clear(); this.filling = false; this.failure = undefined;
        this.notify();
    }
    private notify() { for (const listener of this.listeners) listener(); this.listeners.clear(); }
    private async fill() {
        const controller = this.controller;
        if (!controller || this.filling || this.ready.length >= this.capacity) return;
        this.filling = true; this.failure = undefined;
        const candidates = [...new Set(this.candidates())].filter(key => !this.attempted.has(key));
        for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
        let errors = 0;
        try {
            // Bound each refill, including when the library is unreachable or none qualify.
            for (const key of candidates.slice(0, 80)) {
                if (controller.signal.aborted || this.ready.length >= this.capacity) break;
                this.attempted.add(key);
                try {
                    const value = await this.load(key, controller.signal);
                    if (controller.signal.aborted || this.controller !== controller) return;
                    errors = 0;
                    if (value !== null) { this.ready.push({ key, value }); this.notify(); }
                } catch (error) {
                    if (controller.signal.aborted) return;
                    this.attempted.delete(key); // A network failure may be retried later.
                    this.failure = error instanceof Error ? error : new Error(String(error));
                    if (++errors >= 3) break;
                }
            }
        } finally {
            if (this.controller === controller) { this.filling = false; this.notify(); }
        }
    }
    async take(exclude?: string): Promise<{ key: string; value: T }> {
        this.start();
        const controller = this.controller!;
        while (this.controller === controller && !controller.signal.aborted) {
            let item = this.ready.shift();
            while (item && item.key === exclude) item = this.ready.shift();
            if (item) { void this.fill(); return item; }
            if (!this.filling) throw this.failure ?? new Error('No clear clip found. Try again or turn off the filter.');
            await new Promise<void>(resolve => this.listeners.add(resolve));
        }
        throw new DOMException('Preloading cancelled', 'AbortError');
    }
}
