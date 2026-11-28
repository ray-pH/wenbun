import { analyzeSignal } from './signal';
self.onmessage = (event: MessageEvent<{ samples: Float32Array; rate: number; tones: number[] }>) => {
    try { self.postMessage({ result: analyzeSignal(event.data.samples, event.data.rate, event.data.tones) }); }
    catch (error) { self.postMessage({ error: error instanceof Error ? error.message : String(error) }); }
};
