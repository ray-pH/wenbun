import * as FSRS from "ts-fsrs"

export interface AutoReviewData {
    correctStrokeCount: number;
    incorrectStrokeCount: number;
    totalStrokeCount: number;
    isFailAndReveal: boolean;
}

export const AutoReviewGradeLabel: Record<FSRS.Grade, string> = {
    [FSRS.Rating.Again]: "Fail",
    [FSRS.Rating.Hard]: "Hard",
    [FSRS.Rating.Good]: "Good",
    [FSRS.Rating.Easy]: "Easy",
}

export const AutoReviewGradeClass: Record<FSRS.Grade, string> = {
    [FSRS.Rating.Again]: "again",
    [FSRS.Rating.Hard]: "hard",
    [FSRS.Rating.Good]: "good",
    [FSRS.Rating.Easy]: "easy",
}

export const AutoReviewGradeFAClass: Record<FSRS.Grade, string> = {
    [FSRS.Rating.Again]: "fa fa-solid fa-face-frown",
    [FSRS.Rating.Hard]: "fa fa-solid fa-face-meh",
    [FSRS.Rating.Good]: "fa fa-solid fa-face-smile",
    [FSRS.Rating.Easy]: "fa fa-solid fa-star",
}

export namespace AutoReview {
    export function getGrade(data: AutoReviewData): FSRS.Grade {
        if (data.isFailAndReveal) {
            return FSRS.Rating.Again;
        }
        const mistakeRate = data.correctStrokeCount === 0
            ? Infinity
            : data.incorrectStrokeCount / data.correctStrokeCount;
        // for automatic review, never rate as easy
        if (mistakeRate < 0.25 || data.incorrectStrokeCount <= 2) {
            return FSRS.Rating.Good;
        } else if (mistakeRate < 0.75 || data.incorrectStrokeCount <= 4) {
            return FSRS.Rating.Hard;
        } else {
            return FSRS.Rating.Again;
        }
    }
    
    export function gradeToLabel(grade: FSRS.Grade): string {
        switch (grade) {
            case FSRS.Rating.Again: return "Again";
            case FSRS.Rating.Hard: return "Hard";
            case FSRS.Rating.Good: return "Good";
            default: return "Unknown";
        }
    }
    
    export function getGradeMistakeCountLimits(totalCharStrokeCount: number): {hard: number, again: number} {
        let hard = -1;
        let again = -1;
        // use for loop to make this more generic. 
        // Because in the future, the scoring logic can be changed to be more complex
        for (let i = 0; i < totalCharStrokeCount; i++) {
            const grade = getGrade({
                correctStrokeCount: totalCharStrokeCount,
                incorrectStrokeCount: i,
                totalStrokeCount: totalCharStrokeCount + i,
                isFailAndReveal: false
            });
            if (hard === - 1 && grade === FSRS.Rating.Hard) {
                hard = i;
            }
            if (again === - 1 && grade === FSRS.Rating.Again) {
                again = i;
                break;
            }
        }
        return {hard, again};
    }
}
