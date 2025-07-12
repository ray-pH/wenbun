export interface Card {
    characters: string;
    reading: string;
    meanings: string[];
    tags: string[][]; // separate tags for each character
}

export interface CardConfig {
    isFirstTime: boolean;
    isQuiz: boolean;
}

const deckToURL: Record<string, string> = {
    'old-hsk1': '/assets/decks/old-hsk1.txt',
}

export async function loadDeck(deckName: string) {
    const url = deckToURL[deckName];
    if (!url) return undefined;
    try {
        const res = await fetch(url);
        const text = await res.text();
        return text.split('\n');
    } catch (e) {
        console.error(e);
        return undefined;
    }
}
