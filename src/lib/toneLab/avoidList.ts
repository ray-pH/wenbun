// Temporary exclusions for recordings with known audio problems, independent of pitch scores.
// Keep the source path exact so alternate recordings of the same syllable remain available.
export const AVOIDED_RECORDINGS: ReadonlySet<string> = new Set([
    'hugolpz-audio-cmn-64k/syllabs/cmn-ri3.mp3', // Reported bad ri3 take.
]);
