import * as FSRS from "ts-fsrs";
import { describe, expect, it, vi } from "vitest";
import { App, WenBunCustomState } from "$lib/app";
import { handleAutomaticSuccess, shouldHandleAutomaticSuccess } from "$lib/reviewProcess";

const DECK_ID = "review-process-test";
const CARD_ID = 0;

function createReviewApp(): App {
    const app = new App();
    app.deckData[DECK_ID] = app.getInitDeckData(["你"], []);
    return app;
}

function completeAutomatically(
    app: App,
    { isExtraStudy = false, isGradeWarmUpCards = false } = {},
): Promise<void> {
    const warmUpCount = app.getWarmUpCount(DECK_ID, CARD_ID);
    return handleAutomaticSuccess({
        isExtraStudy,
        cardState: app.getWenbunCustomState(DECK_ID, CARD_ID),
        isFinalWarmUp: warmUpCount !== undefined && warmUpCount >= app.getMaxWarmUpCount(),
        isGradeWarmUpCards,
        onStartWarmUp: () => app.startWarmUp(DECK_ID, CARD_ID),
        onAdvanceWarmUp: () => app.warmUpNext(DECK_ID, CARD_ID),
        onFinishWarmUp: () => app.rateCard(DECK_ID, CARD_ID, FSRS.Rating.Again),
        onExtraStudyGood: () => app.extraStudyHandler.rateGood(CARD_ID),
        onAcceptGrade: () => app.rateCard(DECK_ID, CARD_ID, FSRS.Rating.Good),
    });
}

describe("new-card review transitions", () => {
    it("enters warm-up when the user manually clicks Learn with Auto Next disabled", () => {
        const app = createReviewApp();

        // This is the action performed by the new-card Learn button in +page.svelte.
        app.startWarmUp(DECK_ID, CARD_ID);

        expect(app.isWarmUpCard(DECK_ID, CARD_ID)).toBe(true);
        expect(app.getWenbunCustomState(DECK_ID, CARD_ID)).toBe(WenBunCustomState.WarmUp);
    });

    it("starts the warm-up phase after a new standard-review card succeeds with Auto Next", async () => {
        const app = createReviewApp();

        await completeAutomatically(app);

        expect(app.isWarmUpCard(DECK_ID, CARD_ID)).toBe(true);
    });

    it("advances rather than exits warm-up after an automatic success", async () => {
        const app = createReviewApp();
        app.startWarmUp(DECK_ID, CARD_ID);

        await completeAutomatically(app);

        expect(app.getWarmUpCount(DECK_ID, CARD_ID)).toBe(1);
    });

    it("finishes an ungraded final warm-up after an automatic success", async () => {
        const app = createReviewApp();
        app.startWarmUp(DECK_ID, CARD_ID);
        for (let i = 0; i < app.getMaxWarmUpCount(); i++) {
            app.warmUpNext(DECK_ID, CARD_ID);
        }

        await completeAutomatically(app);

        expect(app.isWarmUpCard(DECK_ID, CARD_ID)).toBe(false);
        expect(app.getWenbunCustomState(DECK_ID, CARD_ID)).toBe(WenBunCustomState.ReviewYoung);
    });

    it("removes an extra-study card after it succeeds", async () => {
        const app = createReviewApp();
        app.extraStudyHandler.registerReviewCardIdsOverride([CARD_ID]);

        await completeAutomatically(app, { isExtraStudy: true });

        expect(app.extraStudyHandler.getCardsCount()).toBe(0);
    });
});

describe("Auto Next On Success eligibility", () => {
    const cases: Array<{
        label: string;
        isAutoNextOnSuccess: boolean;
        isAutoGrading: boolean;
        grade: FSRS.Grade | undefined;
        expected: boolean;
    }> = [
        { label: "is disabled", isAutoNextOnSuccess: false, isAutoGrading: true, grade: FSRS.Rating.Good, expected: false },
        { label: "uses manual grading", isAutoNextOnSuccess: true, isAutoGrading: false, grade: FSRS.Rating.Good, expected: false },
        { label: "has no automatic grade yet", isAutoNextOnSuccess: true, isAutoGrading: true, grade: undefined, expected: false },
        { label: "is graded Again", isAutoNextOnSuccess: true, isAutoGrading: true, grade: FSRS.Rating.Again, expected: false },
        { label: "is graded Hard", isAutoNextOnSuccess: true, isAutoGrading: true, grade: FSRS.Rating.Hard, expected: true },
        { label: "is graded Good", isAutoNextOnSuccess: true, isAutoGrading: true, grade: FSRS.Rating.Good, expected: true },
        { label: "is graded Easy", isAutoNextOnSuccess: true, isAutoGrading: true, grade: FSRS.Rating.Easy, expected: true },
    ];

    it.each(cases)("$label", ({ isAutoNextOnSuccess, isAutoGrading, grade, expected }) => {
        expect(shouldHandleAutomaticSuccess(isAutoNextOnSuccess, isAutoGrading, grade)).toBe(expected);
    });
});

describe("automatic-success routing", () => {
    function createActions(cardState: WenBunCustomState | undefined, overrides: Partial<Pick<
        Parameters<typeof handleAutomaticSuccess>[0],
        "isExtraStudy" | "isFinalWarmUp" | "isGradeWarmUpCards"
    >> = {}) {
        const actions = {
            onStartWarmUp: vi.fn(),
            onAdvanceWarmUp: vi.fn(),
            onFinishWarmUp: vi.fn(),
            onExtraStudyGood: vi.fn(),
            onAcceptGrade: vi.fn(),
        };
        return {
            actions,
            input: {
                isExtraStudy: false,
                cardState,
                isFinalWarmUp: false,
                isGradeWarmUpCards: false,
                ...overrides,
                ...actions,
            },
        };
    }

    async function expectOnlyAction(
        cardState: WenBunCustomState | undefined,
        expectedAction: keyof ReturnType<typeof createActions>["actions"],
        overrides = {},
    ) {
        const { actions, input } = createActions(cardState, overrides);
        await handleAutomaticSuccess(input);
        for (const [name, action] of Object.entries(actions)) {
            expect(action).toHaveBeenCalledTimes(name === expectedAction ? 1 : 0);
        }
    }

    it("starts warm-up for a new standard-review card", async () => {
        await expectOnlyAction(WenBunCustomState.New, "onStartWarmUp");
    });

    it("advances a non-final warm-up card", async () => {
        await expectOnlyAction(WenBunCustomState.WarmUp, "onAdvanceWarmUp");
    });

    it("finishes a final warm-up card when warm-up grading is disabled", async () => {
        await expectOnlyAction(WenBunCustomState.WarmUp, "onFinishWarmUp", { isFinalWarmUp: true });
    });

    it("accepts the grade for a final warm-up card when warm-up grading is enabled", async () => {
        await expectOnlyAction(WenBunCustomState.WarmUp, "onAcceptGrade", {
            isFinalWarmUp: true,
            isGradeWarmUpCards: true,
        });
    });

    it.each([
        WenBunCustomState.Learning,
        WenBunCustomState.Relearning,
        WenBunCustomState.ReviewYoung,
        WenBunCustomState.ReviewMature,
        WenBunCustomState.PreviouslyStudied,
        WenBunCustomState.Ignored,
        undefined,
    ])("accepts the grade for a standard %s card", async (cardState) => {
        await expectOnlyAction(cardState, "onAcceptGrade");
    });

    it.each([
        WenBunCustomState.New,
        WenBunCustomState.WarmUp,
        WenBunCustomState.Learning,
        WenBunCustomState.Relearning,
        WenBunCustomState.ReviewYoung,
        WenBunCustomState.ReviewMature,
        WenBunCustomState.PreviouslyStudied,
        WenBunCustomState.Ignored,
        undefined,
    ])("completes an extra-study %s card", async (cardState) => {
        await expectOnlyAction(cardState, "onExtraStudyGood", { isExtraStudy: true });
    });
});
