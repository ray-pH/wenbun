import { describe, expect, it } from "vitest";
import { splitPinyinSyllables, toneFromPinyin } from "./chinese";

function tonesFromReading(reading: string): number[] {
    return splitPinyinSyllables(reading).split(" ").filter(Boolean).map(toneFromPinyin);
}

describe("tone extraction for pinyin with ü/v edge cases", () => {
    it("returns correct tones for reported examples (accent form)", () => {
        expect(tonesFromReading("lǚ xíng")).toEqual([3, 2]);
        expect(tonesFromReading("hū luè")).toEqual([1, 4]);
        expect(tonesFromReading("nüè dài")).toEqual([4, 4]);
    });

    it("returns correct tones for additional real words (accent form)", () => {
        expect(tonesFromReading("lǚyóu")).toEqual([3, 2]); // 旅游
        expect(tonesFromReading("shěnglüè")).toEqual([3, 4]); // 省略
        expect(tonesFromReading("lüèduó")).toEqual([4, 2]); // 掠夺
        expect(tonesFromReading("yuēlüè")).toEqual([1, 4]); // 约略
        expect(tonesFromReading("nǚ'ér")).toEqual([3, 2]); // 女儿
    });

    it("returns correct tones for dictionary numeric form", () => {
        expect(tonesFromReading("lv3 xing2")).toEqual([3, 2]);
        expect(tonesFromReading("hu1 lue4")).toEqual([1, 4]);
        expect(tonesFromReading("nve4 dai4")).toEqual([4, 4]);
    });

    it("handles compact numeric strings without spaces", () => {
        expect(tonesFromReading("lv3xing2")).toEqual([3, 2]);
        expect(tonesFromReading("nve4dai4")).toEqual([4, 4]);
        expect(tonesFromReading("sheng3lve4")).toEqual([3, 4]);
        expect(tonesFromReading("nve4duo2")).toEqual([4, 2]);
        expect(tonesFromReading("nv3er2")).toEqual([3, 2]);
        expect(tonesFromReading("lu:e4duo2")).toEqual([4, 2]);
    });

    it("normalizes extra whitespace in pre-split pinyin", () => {
        expect(splitPinyinSyllables("  lv3\t  xing2 ")).toBe("lv3 xing2");
    });

    it("keeps neutral tone detection", () => {
        expect(toneFromPinyin("ma")).toBe(5);
        expect(toneFromPinyin("ma5")).toBe(5);
    });

    it("detects decomposed/uppercase tone marks", () => {
        expect(toneFromPinyin("u\u0308\u0300")).toBe(4); // ü + grave
        expect(toneFromPinyin("U\u0308\u0301")).toBe(2); // Ü + acute
        expect(toneFromPinyin("LÜÈ")).toBe(4);
    });
});
