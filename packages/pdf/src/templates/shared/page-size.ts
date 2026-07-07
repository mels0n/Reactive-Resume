import type { Style } from "@react-pdf/types";
import type { ResumeData } from "@reactive-resume/schema/resume/data";

const A4_PAGE_SIZE = {
	width: 595.28,
	height: 841.89,
} as const;

const LETTER_PAGE_SIZE = {
	width: 612,
	height: 792,
} as const;

export const getTemplatePageSize = (format: ResumeData["metadata"]["page"]["format"]) => {
	if (format === "free-form") return { width: A4_PAGE_SIZE.width };
	if (format === "letter") return "LETTER";

	return "A4";
};

export const getTemplatePageMinHeightStyle = (format: ResumeData["metadata"]["page"]["format"]): Style | undefined => {
	if (format !== "free-form") return undefined;

	return { minHeight: A4_PAGE_SIZE.height };
};

/**
 * Numeric page width in points regardless of format — unlike `getTemplatePageSize`, which returns
 * a react-pdf `size` prop ("A4" | "LETTER" | { width }) that can't be read as a number directly.
 * Used by templates that need to measure/wrap content (e.g. Arceus's packed skills line).
 */
export const getTemplatePageWidth = (format: ResumeData["metadata"]["page"]["format"]): number => {
	if (format === "letter") return LETTER_PAGE_SIZE.width;

	return A4_PAGE_SIZE.width;
};
