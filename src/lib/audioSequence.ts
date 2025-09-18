type ClipSpec =
    | string
    | {
        src: string;
        /** Cut this many ms off the end (trims trailing silence). */
        endEarlyMs?: number;
        /** Crossfade duration into the next clip (ms). 0 = no blend. */
        crossfadeMs?: number;
        /** Per-clip base volume (0..1). */
        volume?: number;
        /** Start offset inside this audio (ms). */
        offsetMs?: number;
      };

interface SequenceOptions {
    /** Default trim if a clip doesn't specify (ms). */
    defaultEndEarlyMs?: number;   // e.g. 80
    /** Default crossfade if a clip doesn't specify (ms). */
    defaultCrossfadeMs?: number;  // e.g. 60
    /** Default offset if a clip doesn't specify (ms). */
    defaultOffsetMs?: number;     // e.g. 0
    /** HTMLAudio preload behavior. */
    preload?: "auto" | "metadata" | "none";
}

export class AudioSequence {
    private audios: HTMLAudioElement[];
    private cfg: { endEarlyMs: number; crossfadeMs: number; volume: number; offsetMs: number; }[];
    private defaults: Required<Pick<SequenceOptions, "defaultEndEarlyMs" | "defaultCrossfadeMs" | "defaultOffsetMs" | "preload">>;
    private currentIndex = 0;
    private isPlaying = false;
    private onEnded = this.handleEnded.bind(this);

    // timers+fades for the currently active clip
    private crossfadeTimer: number | null = null;
    private endEarlyTimer: number | null = null;
    private activeFades: Array<() => void> = [];
    private nextStartedEarly = false;

    constructor(items: ClipSpec[], options: SequenceOptions = {}) {
        this.defaults = {
            defaultEndEarlyMs: options.defaultEndEarlyMs ?? 0,
            defaultCrossfadeMs: options.defaultCrossfadeMs ?? 0,
            defaultOffsetMs: options.defaultOffsetMs ?? 0,
            preload: options.preload ?? "auto",
        };

        this.audios = [];
        this.cfg = [];

        for (const it of items) {
            const spec = typeof it === "string" ? { src: it } : it;
            const a = new Audio(spec.src);
            a.preload = this.defaults.preload;
            // start from base volume; we’ll ramp during fades
            a.volume = spec.volume ?? 1;
            if (this.defaults.preload === "auto") {
                try { a.load(); } catch {}
            }
            this.audios.push(a);
            this.cfg.push({
                endEarlyMs: spec.endEarlyMs ?? this.defaults.defaultEndEarlyMs,
                crossfadeMs: spec.crossfadeMs ?? this.defaults.defaultCrossfadeMs,
                volume: spec.volume ?? 1,
                offsetMs: spec.offsetMs ?? this.defaults.defaultOffsetMs,
            });
        }
    }

    /** Start (or restart) the sequence from the first clip */
    public play() {
        if (this.audios.length === 0) return;
        if (this.isPlaying) this.stop();
        this.isPlaying = true;
        this.currentIndex = 0;
        void this.playCurrent();
    }

    /** Stop playback immediately and reset to the beginning */
    public stop() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        this.clearTimersAndFades();

        // pause current and the “next” if we had started it early
        const cur = this.audios[this.currentIndex];
        this.safeStopAudio(cur);

        const next = this.audios[this.currentIndex + 1];
        if (next && !next.paused) this.safeStopAudio(next);

        cur?.removeEventListener("ended", this.onEnded);
        next?.removeEventListener("ended", this.onEnded);

        this.currentIndex = 0;
        this.nextStartedEarly = false;
    }

    // -------------------- internals --------------------

    private async playCurrent() {
        if (!this.isPlaying) return;

        const audio = this.audios[this.currentIndex];
        const cfg = this.cfg[this.currentIndex];

        this.clearTimersAndFades();
        this.nextStartedEarly = false;

        await this.ensureMetadata(audio);

        // Apply offset if any
        audio.currentTime = Math.min(
            (cfg.offsetMs ?? 0) / 1000,
            isFinite(audio.duration) ? audio.duration : 0
        );

        // compute effective durations
        const durationMs = isFinite(audio.duration) ? audio.duration * 1000 : 0;
        const remainingMs = Math.max(0, durationMs - (cfg.offsetMs ?? 0));
        const endEarlyMs = Math.max(0, Math.min(cfg.endEarlyMs, Math.max(0, remainingMs - 20)));
        const effectiveMs = Math.max(0, remainingMs - endEarlyMs);
        let crossfadeMs = Math.max(0, Math.min(cfg.crossfadeMs, Math.max(0, effectiveMs - 20)));

        // clamp crossfade to zero if there is no next
        if (this.currentIndex >= this.audios.length - 1) crossfadeMs = 0;

        // set base volume
        audio.volume = cfg.volume;

        // attach listener and play
        audio.addEventListener("ended", this.onEnded);
        try {
            await audio.play();
        } catch (err) {
            console.warn("Playback failed:", err);
            this.stop();
            return;
        }

        // (A) schedule crossfade start -> early-start next clip with ramp up
        if (crossfadeMs > 0) {
            this.crossfadeTimer = window.setTimeout(() => {
                if (!this.isPlaying) return;
                const nextIx = this.currentIndex + 1;
                const next = this.audios[nextIx];
                const nextCfg = this.cfg[nextIx];
                if (!next) return;

                // ensure metadata for next, then start it muted and ramp in
                void (async () => {
                    await this.ensureMetadata(next);

                    // Prepare next
                    next.currentTime = Math.min(
                        (nextCfg.offsetMs ?? 0) / 1000,
                        isFinite(next.duration) ? next.duration : 0
                    );
                    next.volume = 0;
                    next.addEventListener("ended", this.onEnded);

                    try { await next.play(); }
                    catch (err) {
                        console.warn("Playback failed (next):", err);
                        return;
                    }

                    this.nextStartedEarly = true;

                    // Fade out current and fade in next over crossfadeMs
                    const cancel1 = this.fade(audio, audio.volume, 0, crossfadeMs);
                    const cancel2 = this.fade(next, 0, nextCfg.volume, crossfadeMs);
                    this.activeFades.push(cancel1, cancel2);
                })();
            }, Math.max(0, effectiveMs - crossfadeMs));
        }

        // (B) schedule early end trimming (acts like “ended”)
        if (effectiveMs > 0) {
            this.endEarlyTimer = window.setTimeout(() => {
                if (!this.isPlaying) return;
                // If we trimmed, stop current and hand off to handleEnded()
                audio.removeEventListener("ended", this.onEnded);
                this.safeStopAudio(audio);
                this.handleEnded(); // pretend it ended naturally
            }, effectiveMs);
        }
    }

    private handleEnded() {
        if (!this.isPlaying) return;

        // Clean up any pending timers/fades for the *previous* clip
        this.clearTimersAndFades();

        // advance
        const prevIx = this.currentIndex;
        const prev = this.audios[prevIx];
        prev?.removeEventListener("ended", this.onEnded);

        this.currentIndex++;

        if (this.currentIndex < this.audios.length) {
            const alreadyPlaying = !this.audios[this.currentIndex].paused;
            if (alreadyPlaying) {
                // We started the next during crossfade; keep going.
                // Re-establish timers for the now-current clip.
                void this.playCurrent();
            } else {
                // Start normally.
                void this.playCurrent();
            }
        } else {
            // sequence complete
            this.isPlaying = false;
            this.currentIndex = 0;
        }
    }

    private clearTimersAndFades() {
        if (this.crossfadeTimer !== null) {
            clearTimeout(this.crossfadeTimer);
            this.crossfadeTimer = null;
        }
        if (this.endEarlyTimer !== null) {
            clearTimeout(this.endEarlyTimer);
            this.endEarlyTimer = null;
        }
        for (const cancel of this.activeFades) cancel();
        this.activeFades = [];
    }

    private safeStopAudio(a?: HTMLAudioElement) {
        if (!a) return;
        try {
            a.pause();
            // Reset so subsequent plays start from the beginning (or per-clip offset)
            a.currentTime = 0;
        } catch {}
    }

    private ensureMetadata(a: HTMLAudioElement): Promise<void> {
        if (isFinite(a.duration) && a.duration > 0) return Promise.resolve();
        return new Promise((res) => {
            const onMeta = () => {
                a.removeEventListener("loadedmetadata", onMeta);
                res();
            };
            a.addEventListener("loadedmetadata", onMeta, { once: true });
            // Kick a load if needed
            try { a.load(); } catch {}
        });
    }

    private fade(
        a: HTMLAudioElement,
        from: number,
        to: number,
        durationMs: number
    ): () => void {
        if (durationMs <= 0) {
            a.volume = to;
            return () => {};
        }
        let raf = 0;
        let stopped = false;
        const start = performance.now();

        const step = () => {
            if (stopped) return;
            const t = Math.min(1, (performance.now() - start) / durationMs);
            a.volume = from + (to - from) * t;
            if (t < 1) {
                raf = requestAnimationFrame(step);
            }
        };
        raf = requestAnimationFrame(step);
        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
        };
    }
}
