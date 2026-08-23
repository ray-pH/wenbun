import * as FSRS from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { App, WenBunCustomState } from "$lib/app";
import { handleAutomaticSuccess } from "$lib/reviewProcess";

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
