import * as FSRS from "ts-fsrs";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app";
import { SyncMode } from "./profile";
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

    it.each(["json", "structured clone"])("scans the reported inherited profile after initialization (%s)", async (serialization) => {
        const source = new App();
        const deckId = "hsk1-v2.0";
        const data = source.getInitDeckData(["one", "two", "three"], []);
        data.schedule[2] = {
            ...FSRS.createEmptyCard(new Date("2026-11-15T05:26:35.058Z")),
            state: FSRS.State.Review,
            scheduled_days: 10,
            due: new Date("2026-11-25T05:26:35.058Z"),
        };
        const clone = <T>(value: T): T => serialization === "json"
            ? JSON.parse(JSON.stringify(value)) : structuredClone(value);
        const persisted: Record<string, unknown> = clone({
            decks: [deckId], deckData: { [deckId]: data }, config: { maximumInterval: 35600 },
        });
        const app = new App();
        app.storage = {
            load: async <T>(key: string) => persisted[key] === undefined ? undefined : clone(persisted[key]) as T,
            save: async <T>(key: string, value: T) => { persisted[key] = clone(value); },
        };
        vi.spyOn(app, "updateFontSize").mockImplementation(() => {});
        vi.spyOn(app, "getNow").mockReturnValue(new Date("2026-11-15T05:26:35.058Z"));
        vi.spyOn(app.profile, "getSyncMode").mockResolvedValue(SyncMode.manual);
        await app.init(null);
        expect(app.isLoadDone).toBe(true);
        expect(app.getConfig(null).maximumInterval).toBe(35600);
        expect(app.deckData[deckId].deckConfig).toBeUndefined();
        expect(app.deckData[deckId].schedule[2].state).toBe(2);
        expect(app.deckData[deckId].schedule[2].scheduled_days).toBe(10);
        expect(new Date(app.deckData[deckId].schedule[2].due).toISOString()).toBe("2026-11-25T05:26:35.058Z");
        expect(app.scanOverMaximumIntervalCards(null, 5)).toEqual([
            { deckId, cardId: 2, maximumInterval: 5 },
        ]);
        await app.saveConfig({ ...app.config, maximumInterval: 5 });
        expect(await app.adjustOverMaximumIntervalCards()).toBe(1);
        const reloaded = new App();
        reloaded.storage = app.storage;
        vi.spyOn(reloaded, "updateFontSize").mockImplementation(() => {});
        vi.spyOn(reloaded, "getNow").mockReturnValue(new Date("2026-11-15T05:26:35.058Z"));
        await reloaded.init(null);
        expect(reloaded.getConfig(null).maximumInterval).toBe(5);
        expect(reloaded.deckData[deckId].schedule[2].scheduled_days).toBe(5);
        expect(reloaded.scanOverMaximumIntervalCards(null, 5)).toEqual([]);
    });

    it("loads persisted schedules and respects deck overrides when checking a global draft", async () => {
        const source = createApp();
        source.updateFSRS(deck);
        source.rateCard(deck, 0, FSRS.Rating.Easy, now);
        expect(source.getCard(deck, 0)!.scheduled_days).toBeGreaterThan(5);
        const inherited = "inherited";
        source.deckData[inherited] = source.getInitDeckData(["test"], []);
        source.setCard(inherited, 0, { ...source.getCard(deck, 0)! });
        source.deckData[deck].deckConfig = { maximumInterval: 100 };
        const persisted: Record<string, unknown> = JSON.parse(JSON.stringify({
            decks: [deck, inherited], deckData: source.deckData, config: { maximumInterval: 20 },
        }));
        const app = new App();
        app.storage = {
            load: async <T>(key: string) => persisted[key] as T | undefined,
            save: async () => {},
        };
        vi.spyOn(app, "updateFontSize").mockImplementation(() => {});
        vi.spyOn(app.extraStudyHandler, "init").mockImplementation(() => {});
        vi.spyOn(app, "processTodaySchedule").mockResolvedValue();
        await app.init(null);
        expect(app.isLoadDone).toBe(true);
        expect(app.getConfig(null).maximumInterval).toBe(20);
        expect(app.getConfig(deck).maximumInterval).toBe(100);
        expect(app.scanOverMaximumIntervalCards(null, 5)).toEqual([
            { deckId: inherited, cardId: 0, maximumInterval: 5 },
        ]);
        expect(app.scanOverMaximumIntervalCards(deck, 5)).toEqual([
            { deckId: deck, cardId: 0, maximumInterval: 5 },
        ]);
    });

    it("scans and adjusts scheduler-generated cards after a storage JSON round trip", async () => {
        const app = createApp();
        app.updateFSRS(deck);
        app.rateCard(deck, 0, FSRS.Rating.Easy, now);
        const generated = app.getCard(deck, 0)!;
        expect(generated.state).toBe(FSRS.State.Review);
        expect(generated.scheduled_days).toBeGreaterThan(5);

        app.deckData = JSON.parse(JSON.stringify(app.deckData));
        expect(typeof app.getCard(deck, 0)!.due).toBe("string");
        const expected = [{ deckId: deck, cardId: 0, maximumInterval: 5 }];
        expect(app.scanOverMaximumIntervalCards(null, 5)).toEqual(expected);
        expect(app.scanOverMaximumIntervalCards(deck, 5)).toEqual(expected);

        app.config = { ...app.config, maximumInterval: 5 };
        const save = vi.spyOn(app, "save").mockResolvedValue();
        expect(await app.adjustOverMaximumIntervalCards()).toBe(1);
        expect(app.getCard(deck, 0)!.scheduled_days).toBe(5);
        expect(app.getCard(deck, 0)!.due).toEqual(new Date(now.getTime() + 5 * day));
        expect(app.scanOverMaximumIntervalCards()).toEqual([]);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("scans review cards by effective deck limit, including meta deck descendants only once", () => {
        const app = createApp();
        app.config = { ...app.config, maximumInterval: 10 };
        app.deckData[deck].deckConfig = { maximumInterval: 3 };
        const other = "other";
        const meta = "meta";
        app.deckData[other] = app.getInitDeckData(["other"], []);
        app.deckData[meta] = { ...app.getInitDeckData([], []), isMetaDeck: true, subDeckIds: [deck, other, meta] };
        const card = (state: FSRS.State, scheduled_days: number) => ({
            ...FSRS.createEmptyCard(now), state, scheduled_days, due: new Date(now.getTime() + 20 * day),
        });
        app.setCard(deck, 0, card(FSRS.State.Review, 4));
        app.setCard(deck, 1, card(FSRS.State.Review, 3));
        app.setCard(deck, 2, card(FSRS.State.Learning, 20));
        app.setCard(deck, 3, card(FSRS.State.Relearning, 20));
        app.setCard(other, 0, card(FSRS.State.Review, 11));
        app.setCard(other, 1, { ...card(FSRS.State.Review, 20), due: new Date(NaN) });
        app.deckData[deck].ignoredIds = [0];
        const expected = [
            { deckId: deck, cardId: 0, maximumInterval: 3 },
            { deckId: other, cardId: 0, maximumInterval: 10 },
        ];
        expect(app.scanOverMaximumIntervalCards(meta)).toEqual(expected);
        expect(app.scanOverMaximumIntervalCards()).toEqual(expected);
        expect(app.scanOverMaximumIntervalCards(deck)).toEqual(expected.slice(0, 1));
        expect(app.scanOverMaximumIntervalCards("missing")).toEqual([]);
        expect(app.getCard(deck, 0)!.scheduled_days).toBe(4);
    });

    it("applies a global draft only to inherited limits and a scoped draft to all descendants", () => {
        const app = createApp();
        app.config = { ...app.config, maximumInterval: 20 };
        const other = "other";
        const meta = "meta";
        app.deckData[other] = app.getInitDeckData(["other"], []);
        app.deckData[other].deckConfig = { maximumInterval: 15 };
        app.deckData[meta] = { ...app.getInitDeckData([], []), isMetaDeck: true, subDeckIds: [deck, other] };
        const card = { ...FSRS.createEmptyCard(now), state: FSRS.State.Review, scheduled_days: 12 };
        app.setCard(deck, 0, { ...card });
        app.setCard(other, 0, { ...card });
        expect(app.scanOverMaximumIntervalCards(null, 5)).toEqual([
            { deckId: deck, cardId: 0, maximumInterval: 5 },
        ]);
        expect(app.scanOverMaximumIntervalCards(meta, 5)).toEqual([
            { deckId: deck, cardId: 0, maximumInterval: 5 },
            { deckId: other, cardId: 0, maximumInterval: 5 },
        ]);
        expect(app.scanOverMaximumIntervalCards(other, 5)).toEqual([
            { deckId: other, cardId: 0, maximumInterval: 5 },
        ]);
        expect(app.scanOverMaximumIntervalCards(null, -1)).toEqual([]);
        expect(app.config.maximumInterval).toBe(20);
        expect(app.deckData[other].deckConfig!.maximumInterval).toBe(15);
        expect(app.getCard(deck, 0)!.scheduled_days).toBe(12);
    });

    it("uses an explicit selected limit only for scoped adjustment, not global adjustment", async () => {
        const app = createApp();
        app.config = { ...app.config, maximumInterval: 20 };
        const other = "other";
        const meta = "meta";
        app.deckData[other] = app.getInitDeckData(["other"], []);
        app.deckData[other].deckConfig = { maximumInterval: 15 };
        app.deckData[meta] = { ...app.getInitDeckData([], []), isMetaDeck: true, subDeckIds: [deck, other] };
        const card = { ...FSRS.createEmptyCard(now), state: FSRS.State.Review, scheduled_days: 12,
            due: new Date(now.getTime() + 12 * day) };
        app.setCard(deck, 0, { ...card });
        app.setCard(other, 0, { ...card });
        const save = vi.spyOn(app, "save").mockResolvedValue();
        expect(await app.adjustOverMaximumIntervalCards(null, 5)).toBe(0);
        expect(await app.adjustOverMaximumIntervalCards(meta, 5)).toBe(2);
        expect(app.getCard(other, 0)!.scheduled_days).toBe(5);
        expect(app.getCard(other, 0)!.due).toEqual(new Date(now.getTime() + 5 * day));
        expect(app.deckData[other].deckConfig!.maximumInterval).toBe(15);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("adjusts selected cards without postponing due dates, saves once, and is idempotent", async () => {
        const app = createApp();
        app.config = { ...app.config, maximumInterval: 5 };
        const save = vi.spyOn(app, "save").mockResolvedValue();
        const makeCard = (offset: number) => ({
            ...FSRS.createEmptyCard(now), state: FSRS.State.Review, scheduled_days: 30,
            due: new Date(now.getTime() + offset * day), stability: 42, reps: 7,
            last_review: new Date(now.getTime() - 10 * day),
        });
        app.setCard(deck, 0, makeCard(20));
        app.setCard(deck, 1, makeCard(2));
        app.setCard(deck, 2, makeCard(-2));
        // Profiles loaded from JSON contain date strings.
        app.getCard(deck, 0)!.due = app.getCard(deck, 0)!.due.toISOString() as unknown as Date;
        const before = { ...app.getCard(deck, 0)! };
        expect(await app.adjustOverMaximumIntervalCards(deck)).toBe(3);
        expect(app.getCard(deck, 0)).toEqual({ ...before, due: new Date(now.getTime() - 5 * day), scheduled_days: 5 });
        expect(app.getCard(deck, 1)!.due).toEqual(new Date(now.getTime() - 5 * day));
        expect(app.getCard(deck, 2)!.due).toEqual(new Date(now.getTime() - 5 * day));
        expect(save).toHaveBeenCalledTimes(1);
        expect(await app.adjustOverMaximumIntervalCards(deck)).toBe(0);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("uses serialized last review dates and falls back to now for missing or invalid reviews", async () => {
        const app = createApp();
        app.config = { ...app.config, maximumInterval: 5 };
        vi.spyOn(app, "save").mockResolvedValue();
        const makeCard = (offset: number) => ({
            ...FSRS.createEmptyCard(now), state: FSRS.State.Review, scheduled_days: 30,
            due: new Date(now.getTime() + offset * day),
        });
        app.setCard(deck, 0, { ...makeCard(20), last_review: new Date(now.getTime() - 2 * day).toISOString() as unknown as Date });
        app.setCard(deck, 1, makeCard(20));
        app.setCard(deck, 2, { ...makeCard(20), last_review: new Date(NaN) });
        app.setCard(deck, 3, { ...makeCard(-3), last_review: new Date(NaN) });
        app.setCard(deck, 4, { ...makeCard(-4), last_review: new Date(now.getTime() - 2 * day) });
        expect(await app.adjustOverMaximumIntervalCards(deck)).toBe(5);
        expect(app.getCard(deck, 0)!.due).toEqual(new Date(now.getTime() + 3 * day));
        expect(app.getCard(deck, 1)!.due).toEqual(new Date(now.getTime() + 5 * day));
        expect(app.getCard(deck, 2)!.due).toEqual(new Date(now.getTime() + 5 * day));
        expect(app.getCard(deck, 3)!.due).toEqual(new Date(now.getTime() - 3 * day));
        expect(app.getCard(deck, 4)!.due).toEqual(new Date(now.getTime() - 4 * day));
        for (let id = 0; id < 5; id++) expect(app.getCard(deck, id)!.scheduled_days).toBe(5);
    });

    it("uses the scheduler fallback for invalid limits and does not touch other decks", async () => {
        const app = createApp();
        app.config = { ...app.config, maximumInterval: 2 };
        app.deckData[deck].deckConfig = { maximumInterval: -1 };
        const other = "other";
        app.deckData[other] = app.getInitDeckData(["other"], []);
        const card = { ...FSRS.createEmptyCard(now), state: FSRS.State.Review, scheduled_days: 3 };
        app.setCard(deck, 0, { ...card });
        app.setCard(other, 0, { ...card });
        vi.spyOn(app, "save").mockResolvedValue();
        expect(app.scanOverMaximumIntervalCards()).toEqual([{ deckId: other, cardId: 0, maximumInterval: 2 }]);
        expect(await app.adjustOverMaximumIntervalCards(deck)).toBe(0);
        expect(app.getCard(other, 0)!.scheduled_days).toBe(3);
        expect(await app.adjustOverMaximumIntervalCards()).toBe(1);
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
