import type { MeasureText } from "./keyword-lines";
import { describe, expect, it } from "vitest";
import { createApproximateMeasure, packKeywordLines } from "./keyword-lines";

const mono: MeasureText = (text) => text.length * 10;

describe("packKeywordLines", () => {
	it("returns no lines for empty input", () => {
		expect(packKeywordLines([], 100, mono)).toEqual([]);
		expect(packKeywordLines(["  ", ""], 100, mono)).toEqual([]);
	});

	it("keeps everything on one line when it fits", () => {
		// "ab"(20) + " | "(30) + "cd"(20) = 70 <= 100
		expect(packKeywordLines(["ab", "cd"], 100, mono)).toEqual([["ab", "cd"]]);
	});

	it("accounts for separator width when packing", () => {
		// 40 + 30 + 40 = 110 > 80 -> two lines
		expect(packKeywordLines(["abcd", "efgh"], 80, mono)).toEqual([["abcd"], ["efgh"]]);
	});

	it("never splits a keyword, even wider than the line", () => {
		expect(packKeywordLines(["averyverylongkeyword"], 100, mono)).toEqual([["averyverylongkeyword"]]);
	});

	it("packs widest-first and back-fills earlier lines (FFD)", () => {
		// widths: eeeeee=60, cccc=40, aa=20; maxWidth=100
		// line1: eeeeee(60); cccc -> 60+30+40=130 no -> line2 cccc(40); aa -> line1 110 no, line2 40+30+20=90 yes
		expect(packKeywordLines(["aa", "eeeeee", "cccc"], 100, mono)).toEqual([["eeeeee"], ["cccc", "aa"]]);
	});

	it("is deterministic for equal widths (stable sort)", () => {
		expect(packKeywordLines(["bb", "aa"], 100, mono)).toEqual([["bb", "aa"]]);
	});
});

describe("createApproximateMeasure", () => {
	it("scales with font size and string length", () => {
		const measure = createApproximateMeasure(10);
		expect(measure("mm")).toBeGreaterThan(measure("ii"));
		expect(createApproximateMeasure(20)("abc")).toBeCloseTo(measure("abc") * 2, 5);
	});
});
