export interface SettingsSearchEntry {
    key: string;
    title: string;
    description: string;
    keywords?: string;
}

function words(text: string): string[] {
    return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

// Optimal string alignment distance includes adjacent transpositions as one typo.
function editDistance(a: string, b: string): number {
    const distances = Array.from({ length: a.length + 1 }, (_, i) =>
        Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            distances[i][j] = Math.min(
                distances[i - 1][j] + 1,
                distances[i][j - 1] + 1,
                distances[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
            );
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                distances[i][j] = Math.min(distances[i][j], distances[i - 2][j - 2] + 1);
            }
        }
    }
    return distances[a.length][b.length];
}

function wordScore(query: string, candidate: string): number {
    if (query === candidate) return 3;
    if (candidate.startsWith(query)) return 2;
    if (query.length >= 3 && candidate.includes(query)) return 1;
    if (query.length >= 3 && candidate.length >= 3) {
        const maxEdits = query.length >= 6 ? 2 : 1;
        // Compare against prefixes too, so a typo still matches while the user is typing.
        for (let length = Math.max(3, query.length - maxEdits); length <= Math.min(candidate.length, query.length + maxEdits); length++) {
            if (editDistance(query, candidate.slice(0, length)) <= maxEdits) return 1;
        }
    }
    return 0;
}

/**
 * Returns original entries in relevance order without mutating the input.
 * Every query word must match; words may match across title, description and keywords.
 * Empty or punctuation-only queries return all entries in their original order.
 */
export function searchSettings<T extends SettingsSearchEntry>(entries: readonly T[], query: string): T[] {
    const queryWords = words(query);
    if (queryWords.length === 0) return [...entries];

    const ranked = entries.flatMap((entry, index) => {
        const fields = [words(entry.title), words(entry.description), words(entry.keywords ?? '')];
        let tier = 0;
        let score = 0;
        for (const queryWord of queryWords) {
            let matchedTier = -1;
            let best = 0;
            for (let field = 0; field < fields.length; field++) {
                const fieldScore = fields[field].reduce((max, word) => Math.max(max, wordScore(queryWord, word)), 0);
                if (fieldScore > 0) {
                    matchedTier = field;
                    best = fieldScore;
                    break;
                }
            }
            if (matchedTier < 0) return [];
            tier = Math.max(tier, matchedTier);
            score += best;
        }
        return [{ entry, index, tier, score }];
    });
    ranked.sort((a, b) => a.tier - b.tier || b.score - a.score || a.index - b.index);
    return ranked.map(({ entry }) => entry);
}
