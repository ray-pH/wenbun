import { describe, expect, it } from 'vitest';
import { DEFAULT_MINIMUM_SCORE, qualifiesForClearAudio } from './clarity';
import type { SyllableScore } from './pitch';
const clip = { tones: [2], flags: [] };
const score = (fit: number): SyllableScore => ({ start: 0, end: 1, expected: 2, guess: 2, coverage: .8, contourScores: [20, fit, 20, 20], movementScores: [20, fit, 20, 20], scores: [20, fit, 20, 20], margin: fit - 20, flags: fit < 65 ? ['Weak fit'] : [] });
describe('clear audio score threshold', () => {
    it('accepts modest matching weak fits at the default floor, but rejects weaker fits', () => {
        expect(DEFAULT_MINIMUM_SCORE).toBe(50);
        expect(qualifiesForClearAudio(clip, [score(50)])).toBe(true);
        expect(qualifiesForClearAudio(clip, [score(64)])).toBe(true);
        expect(qualifiesForClearAudio(clip, [score(49)])).toBe(false);
    });
    it('re-evaluates the same cached evidence when the threshold changes', () => {
        const evidence = [score(60)];
        expect(qualifiesForClearAudio(clip, evidence, 70)).toBe(false);
        expect(qualifiesForClearAudio(clip, evidence, 50)).toBe(true);
    });
    it('requires every syllable to pass instead of hiding weak ones behind an average', () => {
        expect(qualifiesForClearAudio({ tones: [2,2], flags: [] }, [score(95), score(49)])).toBe(false);
    });
    it('rejects mismatches, sparse pitch, and close candidates despite high scores', () => {
        expect(qualifiesForClearAudio(clip, [{ ...score(90), guess: 1 }])).toBe(false);
        expect(qualifiesForClearAudio(clip, [{ ...score(90), coverage: .44 }])).toBe(false);
        expect(qualifiesForClearAudio(clip, [{ ...score(90), margin: 11 }])).toBe(false);
        expect(qualifiesForClearAudio(clip, [{ ...score(90), flags: ['Sparse pitch'] }])).toBe(false);
        expect(qualifiesForClearAudio(clip, [{ ...score(90), guess: null }])).toBe(false);
    });
    it('rejects missing, neutral, or inconsistent tone keys and invalid scores', () => {
        expect(qualifiesForClearAudio({ tones: [], flags: [] }, [])).toBe(false);
        expect(qualifiesForClearAudio({ tones: [0], flags: [] }, [{ ...score(90), expected: 0, guess: 1 }])).toBe(false);
        expect(qualifiesForClearAudio({ tones: [2], flags: ['Sandhi needs review'] }, [score(90)])).toBe(false);
        expect(qualifiesForClearAudio({ tones: [1], flags: [] }, [score(90)])).toBe(false);
        expect(qualifiesForClearAudio(clip, [score(NaN)])).toBe(false);
    });
});
