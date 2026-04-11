import { describe, expect, it } from "vitest";
import { getDaysSinceEpochLocal } from "./util";

function withTZ<T>(tz: string, run: () => T): T {
    const prev = process.env.TZ;
    process.env.TZ = tz;
    try {
        return run();
    } finally {
        if (prev === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = prev;
        }
    }
}

describe("getDaysSinceEpochLocal", () => {
    it("increments by 1 on consecutive dates in a stable timezone day", () => {
        withTZ("UTC", () => {
            const day1 = new Date(2026, 2, 10, 12, 0, 0);
            const day2 = new Date(2026, 2, 11, 12, 0, 0);

            expect(getDaysSinceEpochLocal(day2) - getDaysSinceEpochLocal(day1)).toBe(1);
        });
    });

    it("treats consecutive local dates as different days across Europe/London DST spring-forward", () => {
        withTZ("Europe/London", () => {
            const mar29 = new Date(2026, 2, 29, 12, 0, 0);
            const mar30 = new Date(2026, 2, 30, 12, 0, 0);

            const midnight29 = new Date(mar29.getFullYear(), mar29.getMonth(), mar29.getDate());
            const midnight30 = new Date(mar30.getFullYear(), mar30.getMonth(), mar30.getDate());

            // DST spring-forward day has a 23h local-midnight gap.
            const hourDelta = (midnight30.getTime() - midnight29.getTime()) / (1000 * 60 * 60);
            expect(hourDelta).toBe(23);

            // Even with a 23h midnight gap, these are still different calendar days.
            expect(getDaysSinceEpochLocal(mar30) - getDaysSinceEpochLocal(mar29)).toBe(1);
        });
    });

    it("treats consecutive local dates as different days across America/New_York DST spring-forward", () => {
        withTZ("America/New_York", () => {
            const mar8 = new Date(2026, 2, 8, 12, 0, 0);
            const mar9 = new Date(2026, 2, 9, 12, 0, 0);

            const midnight8 = new Date(mar8.getFullYear(), mar8.getMonth(), mar8.getDate());
            const midnight9 = new Date(mar9.getFullYear(), mar9.getMonth(), mar9.getDate());

            // Another 23h midnight gap due to DST.
            const hourDelta = (midnight9.getTime() - midnight8.getTime()) / (1000 * 60 * 60);
            expect(hourDelta).toBe(23);

            expect(getDaysSinceEpochLocal(mar9) - getDaysSinceEpochLocal(mar8)).toBe(1);
        });
    });
});