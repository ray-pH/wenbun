import { afterEach, describe, expect, it, vi } from "vitest";
import { ChineseCharacterWordlist, ChineseMandarinReading, splitPinyinSyllables, toneFromPinyin } from "./chinese";

function tonesFromReading(reading: string): number[] {
    return splitPinyinSyllables(reading).split(" ").filter(Boolean).map(toneFromPinyin);
}

describe("alternative Mandarin readings", () => {
    afterEach(() => vi.unstubAllGlobals());

    async function makeWordlist(lang: 'zh' | 'yue' = 'zh') {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            let data: unknown = {};
            if (url.endsWith('/zh_dict.json')) data = {
                行: {meaning: 'walk; row', pinyin_num: 'xing2', pinyin: 'xíng', jyutping: 'hang4'},
                重: {meaning: 'heavy', pinyin_num: 'zhong4', pinyin: 'zhòng', jyutping: 'cung5'},
                长: {meaning: 'long', pinyin_num: 'zhang3', pinyin: 'zhǎng', jyutping: 'coeng4'},
                银行: {meaning: 'bank', pinyin_num: 'yin2 hang2', pinyin: 'yín háng', jyutping: 'ngan4 hang4'},
            };
            if (url.endsWith('/zh_mandarin_alternatives.json')) data = {
                行: [{pinyin_num: 'hang2', pinyin: 'háng'}],
                重: [{pinyin_num: 'chong2', pinyin: 'chóng'}],
                长: [{pinyin_num: 'chang2', pinyin: 'cháng'}],
            };
            return {ok: true, json: async () => data, text: async () => url.endsWith('/zh_makemeahanzi.jsonl') ? '{"character":"行","pinyin":["xíng"]}' : ''};
        }));
        const wordlist = new ChineseCharacterWordlist();
        await wordlist.init(lang);
        return wordlist;
    }

    it('returns alternatives in each Mandarin notation and uses primary tones', async () => {
        const wordlist = await makeWordlist();
        expect(wordlist.getReadings('行')).toEqual(['xíng', 'háng']);
        expect(wordlist.getReadings('行', 'zh', ChineseMandarinReading.PinyinNumeric)).toEqual(['xing2', 'hang2']);
        expect(wordlist.getReadings('行', 'zh', ChineseMandarinReading.Zhuyin)).toEqual(['ㄒㄧㄥˊ', 'ㄏㄤˊ']);
        expect(wordlist.getCharacterWriterData('重')).toMatchObject({reading: 'zhòng', readings: ['zhòng', 'chóng'], tags: [['tone-4']]});
    });

    it('uses simplified lookup, preserves single readings and respects custom overrides', async () => {
        const wordlist = await makeWordlist();
        expect(wordlist.getReadings('長')).toEqual(['zhǎng', 'cháng']);
        expect(wordlist.getReadings('银行')).toEqual(['yín háng']);
        expect(wordlist.getReadings('missing')).toEqual([]);
        wordlist.registerCustomEntryDict({重: {reading: 'chóng'}});
        expect(wordlist.getReadings('重')).toEqual(['chóng']);
        expect(wordlist.getCharacterWriterData('重')?.tags).toEqual([['tone-2']]);
    });

    it('does not add Mandarin alternatives to Cantonese readings', async () => {
        const wordlist = await makeWordlist('yue');
        expect(wordlist.getReadings('行', 'yue')).toEqual(['hang4']);
    });
});

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
