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