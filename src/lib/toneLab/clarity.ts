import type { SyllableScore } from './pitch';
export const DEFAULT_MINIMUM_SCORE = 50;
/** Weak fit is diagnostic, not a veto: apply the user's numeric floor to every syllable. */
export function qualifiesForClearAudio(
    clip: { tones: number[]; flags: string[] },
    scores: SyllableScore[],
    minimumScore = DEFAULT_MINIMUM_SCORE,
): boolean {
    return Number.isFinite(minimumScore) && minimumScore >= 0 && minimumScore <= 100
        && !clip.flags.length && clip.tones.length > 0 && scores.length === clip.tones.length
        && scores.every((score, i) => {
            const fit = score.scores[score.expected - 1];
            return score.expected === clip.tones[i] && score.expected >= 1 && score.expected <= 4
                && score.guess === score.expected && score.coverage >= .45 && score.margin >= 12
                && !score.flags.some(flag => flag !== 'Weak fit')
                && Number.isFinite(fit) && fit >= minimumScore;
        });
}
