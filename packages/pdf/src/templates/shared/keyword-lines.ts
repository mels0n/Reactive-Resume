export type MeasureText = (text: string) => number;

/**
 * Packs keywords into dense pipe-separated lines using first-fit-decreasing so no
 * keyword is ever split across lines and each line is as full as possible. Used by
 * templates with packed keyword blocks (for example, the Arceus skills section).
 */
export const packKeywordLines = (
	keywords: string[],
	maxWidth: number,
	measure: MeasureText,
	separator = " | ",
): string[][] => {
	const cleaned = keywords.map((keyword) => keyword.trim()).filter((keyword) => keyword.length > 0);
	if (cleaned.length === 0 || maxWidth <= 0) return [];

	const separatorWidth = measure(separator);
	const measured = cleaned.map((text) => ({ text, width: measure(text) }));
	measured.sort((a, b) => b.width - a.width);

	const lines: { texts: string[]; width: number }[] = [];

	for (const keyword of measured) {
		let placed = false;
		for (const line of lines) {
			const widthToAdd = (line.texts.length > 0 ? separatorWidth : 0) + keyword.width;
			if (line.width + widthToAdd <= maxWidth) {
				line.texts.push(keyword.text);
				line.width += widthToAdd;
				placed = true;
				break;
			}
		}
		if (!placed) lines.push({ texts: [keyword.text], width: keyword.width });
	}

	return lines.map((line) => line.texts);
};

const NARROW_CHARS = new Set([..."iljI.,:;|'!()[] "]);
const WIDE_CHARS = new Set([..."mwMW"]);

const charFactor = (char: string): number => {
	if (NARROW_CHARS.has(char)) return 0.32;
	if (WIDE_CHARS.has(char)) return 0.85;
	if (/[A-Z0-9]/.test(char)) return 0.68;
	return 0.52;
};

/**
 * Width estimate from average glyph proportions — deliberately slightly
 * conservative so packed lines never overflow the true rendered width.
 */
export const createApproximateMeasure = (fontSize: number): MeasureText => {
	return (text) => {
		let units = 0;
		for (const char of text) units += charFactor(char);
		return units * fontSize;
	};
};
