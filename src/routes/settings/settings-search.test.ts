import { describe, expect, it } from 'vitest';
import { searchSettings } from './settings-search';
const entry = (key: string, title: string, description = '', keywords?: string) => ({ key, title, description, keywords });

describe('searchSettings', () => {
    it('prioritizes title over description over keywords even for fuzzy matches', () => {
        const entries = [
            entry('colorScheme', 'Appearance', '', 'theme'),
            entry('description', 'Other', 'Choose a dark theme'),
            entry('title', 'Thme'),
        ];
        expect(searchSettings(entries, 'theme').map(item => item.key)).toEqual(['title', 'description', 'colorScheme']);
    });

    it('ranks exact words above prefixes and typos, preserving stable ties', () => {
        const entries = [entry('typo', 'Colro'), entry('prefix', 'Colorful'), entry('first', 'Color'), entry('second', 'Color')];
        expect(searchSettings(entries, 'COLOR').map(item => item.key)).toEqual(['first', 'second', 'prefix', 'typo']);
    });

    it('requires every word and supports words across fields in any order', () => {
        const entries = [entry('both', 'Review limit', 'Daily quota'), entry('partial', 'Review settings')];
        expect(searchSettings(entries, 'DAILY reveiw')).toEqual([entries[0]]);
        expect(searchSettings(entries, 'review missing')).toEqual([]);
    });

    it('handles insertion, deletion, substitution, transposition and prefixes', () => {
        const entries = [entry('x', 'Retention')];
        for (const query of ['retntion', 'retenttion', 'retantion', 'retne tion'.replace(' ', ''), 'reten']) {
            expect(searchSettings(entries, query), query).toEqual(entries);
        }
    });

    it('matches partial words, typos while typing, and multiple typos in longer words', () => {
        const entries = [entry('x', 'Retention')];
        for (const query of ['re', 'tention', 'retnt', 'retntoin']) {
            expect(searchSettings(entries, query), query).toEqual(entries);
        }
    });

    it('avoids unrelated matches', () => {
        const entries = [entry('x', 'Retention')];
        for (const query of ['xyz', 'banana']) {
            expect(searchSettings(entries, query), query).toEqual([]);
        }
    });

    it('uses only the keywords supplied by each entry, regardless of key', () => {
        const entries = [
            entry('colorScheme', 'Appearance'),
            entry('custom', 'Display', '', 'theme palette'),
            entry('custom', 'Layout', '', 'shortcut'),
            entry('empty', 'Other', '', ''),
        ];
        expect(searchSettings(entries, 'theme')).toEqual([entries[1]]);
        expect(searchSettings(entries, 'palete')).toEqual([entries[1]]);
        expect(searchSettings(entries, 'short')).toEqual([entries[2]]);
        expect(searchSettings(entries, 'display palette')).toEqual([entries[1]]);
        expect(searchSettings(entries, 'theme shortcut')).toEqual([]);
    });

    it('returns a fresh array for empty queries and never mutates entries', () => {
        const entries = Object.freeze([Object.freeze({ ...entry('x', 'Example'), extra: 42 })]);
        for (const query of ['', '   ', '?!']) {
            const result = searchSettings(entries, query);
            expect(result).toEqual(entries);
            expect(result).not.toBe(entries);
            expect(result[0]).toBe(entries[0]);
            expect(result[0].extra).toBe(42);
        }
        expect(searchSettings(entries, 'example')).toEqual(entries);
    });
});
