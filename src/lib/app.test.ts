import * as FSRS from "ts-fsrs";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app";
import { dateDiffFormatted } from "./util";

const deck = "interval-test";
const now = new Date("2025-01-10T12:00:00Z");
const day = 86400000;
const grades = [FSRS.Rating.Again, FSRS.Rating.Hard, FSRS.Rating.Good, FSRS.Rating.Easy] as const;

function createApp(): App {
    const app = new App();
    app.deckData[deck] = app.getInitDeckData(["test"], []);
    vi.spyOn(app, "getNow").mockReturnValue(now);
    vi.spyOn(app, "pushReviewLog").mockImplementation(() => {});
    return app;
}

describe("maximum review interval", () => {
    it("uses the library default and validates global and deck values for both schedulers", () => {
        const app = createApp();
        expect(app.fsrs.parameters.maximum_interval).toBe(FSRS.default_maximum_interval);
        expect(app.fsrsPrevStudied.parameters.maximum_interval).toBe(FSRS.default_maximum_interval);
        app.config = { ...app.config, maximumInterval: 20 };
        app.deckData[deck].deckConfig = { maximumInterval: 3 };
        app.updateFSRS(deck);
        expect(app.fsrs.parameters.maximum_interval).toBe(3);
        expect(app.fsrsPrevStudied.parameters.maximum_interval).toBe(3);
        app.updateFSRS(null);
        expect(app.fsrs.parameters.maximum_interval).toBe(20);
        for (const invalid of [0, -1, 1.5, NaN, Infinity, "3", null]) {
            app.deckData[deck].deckConfig = { maximumInterval: invalid as number };
            app.updateFSRS(deck);
            expect(app.fsrs.parameters.maximum_interval).toBe(FSRS.default_maximum_interval);
            expect(app.fsrsPrevStudied.parameters.maximum_interval).toBe(FSRS.default_maximum_interval);
        }
    });

    it.each([false, true])("caps all generated grades and matches previews (short term: %s)", (shortTerm) => {
        for (const grade of grades) {
            const app = createApp();
            app.config = { ...app.config, maximumInterval: 1, enableShortTerm: shortTerm, enableFuzz: true };
            app.updateFSRS(deck);
            const card = FSRS.createEmptyCard(now);
            Object.assign(card, { state: FSRS.State.Review, stability: 100, difficulty: 5, reps: 5, last_review: new Date(now.getTime() - 100 * day) });
            app.setCard(deck, 0, card);
            const preview = app.getRatingScheduledTimeStr(deck, 0)[grade];
            app.rateCard(deck, 0, grade, now);
            const result = app.getCard(deck, 0)!;
            expect(result.scheduled_days).toBeLessThanOrEqual(1);
            expect(result.due.getTime() - now.getTime()).toBeLessThanOrEqual(day);
            expect(preview).toBe(dateDiffFormatted(now, result.due));
        }
    });

    it("uses the cap for previously studied cards and leaves explicit day-long learning steps untouched", () => {
        const app = createApp();
        app.config = { ...app.config, maximumInterval: 1, enableShortTerm: true, previouslyStudiedLearningSteps: ["5d"] };
        app.updateFSRS(deck);
        app.deckData[deck].previouslyStudied.push(0);
        const preview = app.getRatingScheduledTimeStr(deck, 0)[FSRS.Rating.Again];
        app.rateCard(deck, 0, FSRS.Rating.Again, now);
        const result = app.getCard(deck, 0)!;
        expect(result.scheduled_days).toBe(5);
        expect(result.due.getTime() - now.getTime()).toBe(5 * day);
        expect(preview).toBe(dateDiffFormatted(now, result.due));
    });

    it("caps generated intervals for previously studied cards", () => {
        const app = createApp();
        app.config = { ...app.config, maximumInterval: 1, enableShortTerm: false };
        app.updateFSRS(deck);
        app.deckData[deck].previouslyStudied.push(0);
        app.rateCard(deck, 0, FSRS.Rating.Easy, now);
        expect(app.getCard(deck, 0)!.scheduled_days).toBe(1);
    });
});
