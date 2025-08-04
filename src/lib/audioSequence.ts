export class AudioSequence {
    private audios: HTMLAudioElement[];
    private currentIndex = 0;
    private isPlaying = false;
    private onEnded = this.handleEnded.bind(this);

    constructor(srcList: string[], load: boolean = true) {
        this.audios = srcList.map((src) => {
            const a = new Audio(src);
            a.preload = "auto";
            if (load) a.load();
            return a;
        });
    }

    private handleEnded() {
        // clean up listener on the one that just finished
        const prev = this.audios[this.currentIndex];
        prev.removeEventListener("ended", this.onEnded);

        this.currentIndex++;
        if (this.currentIndex < this.audios.length) {
            this.playCurrent();
        } else {
            // sequence complete
            this.isPlaying = false;
            this.currentIndex = 0;
        }
    }

    private playCurrent() {
        const audio = this.audios[this.currentIndex];
        audio.addEventListener("ended", this.onEnded);
        audio.currentTime = 0;
        audio.play().catch((err) => {
            console.warn("Playback failed:", err);
            this.stop();
        });
    }

    /** Start (or restart) the sequence from the first clip */
    public play() {
        if (this.audios.length === 0) return;
        if (this.isPlaying) this.stop();
        this.isPlaying = true;
        this.currentIndex = 0;
        this.playCurrent();
    }

    /** Stop playback immediately and reset to the beginning */
    public stop() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        const audio = this.audios[this.currentIndex];
        audio.pause();
        audio.currentTime = 0;
        audio.removeEventListener("ended", this.onEnded);
        this.currentIndex = 0;
    }
}
