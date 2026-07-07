import { describe, expect, it } from "vitest";
import { getTemplatePageMinHeightStyle, getTemplatePageSize, getTemplatePageWidth } from "./page-size";

describe("getTemplatePageSize", () => {
	it("returns 'A4' for a4 format", () => {
		expect(getTemplatePageSize("a4")).toBe("A4");
	});

	it("returns 'LETTER' for letter format", () => {
		expect(getTemplatePageSize("letter")).toBe("LETTER");
	});

	it("returns custom width for free-form format", () => {
		const result = getTemplatePageSize("free-form");
		expect(typeof result).toBe("object");
		if (typeof result === "object") {
			expect(result.width).toBeCloseTo(595.28, 2);
		}
	});
});

describe("getTemplatePageMinHeightStyle", () => {
	it("returns undefined for non-free-form formats", () => {
		expect(getTemplatePageMinHeightStyle("a4")).toBeUndefined();
		expect(getTemplatePageMinHeightStyle("letter")).toBeUndefined();
	});

	it("returns A4-style minHeight for free-form", () => {
		expect(getTemplatePageMinHeightStyle("free-form")).toEqual({ minHeight: 841.89 });
	});
});

describe("getTemplatePageWidth", () => {
	it("returns the A4 width for a4 format", () => {
		expect(getTemplatePageWidth("a4")).toBeCloseTo(595.28, 2);
	});

	it("returns the letter width for letter format", () => {
		expect(getTemplatePageWidth("letter")).toBe(612);
	});

	it("falls back to the A4 width for free-form (or any other) format", () => {
		expect(getTemplatePageWidth("free-form")).toBeCloseTo(595.28, 2);
	});
});
