import { describe, expect, it } from "vitest";
import { getArceusHeaderLayout } from "./header-layout";

const field = (id: string) => ({ id, icon: "", text: id, link: "" });

const basics = (overrides: Partial<Parameters<typeof getArceusHeaderLayout>[0]> = {}) => ({
	email: "a@b.c",
	phone: "+1 555",
	website: { url: "https://x.dev", label: "" },
	customFields: [],
	...overrides,
});

describe("getArceusHeaderLayout", () => {
	it("splits custom fields alternating: even indices right, odd indices left", () => {
		const layout = getArceusHeaderLayout(basics({ customFields: [field("0"), field("1"), field("2")] }));
		expect(layout.rightFields.map((f) => f.id)).toEqual(["0", "2"]);
		expect(layout.leftFields.map((f) => f.id)).toEqual(["1"]);
	});

	it("centers the phone when columns are balanced", () => {
		// left: email = 1; right: website = 1
		expect(getArceusHeaderLayout(basics()).phonePlacement).toBe("center");
	});

	it("moves the phone to the lighter side", () => {
		// left: email + 1 odd field = 2; right: website + 1 even field... use 3 fields:
		// even(0,2) -> right = website + 2 = 3; odd(1) -> left = email + 1 = 2 -> phone left
		const heavier = getArceusHeaderLayout(basics({ customFields: [field("0"), field("1"), field("2")] }));
		expect(heavier.phonePlacement).toBe("left");

		// no website: left: email = 1; right: 0 -> phone right
		const lighter = getArceusHeaderLayout(basics({ website: { url: "", label: "" } }));
		expect(lighter.phonePlacement).toBe("right");
	});
});
