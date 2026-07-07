import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("ArceusPage", () => {
	const source = readFileSync(fileURLToPath(new URL("./ArceusPage.tsx", import.meta.url)), "utf8");

	it("hides the skills section heading and packs keywords into lines", () => {
		expect(source).toContain("packKeywordLines");
		expect(source).toContain("ArceusSkills");
	});

	it("renders the tagline inside the header banner", () => {
		expect(source).toContain("basics.tagline");
	});
});
