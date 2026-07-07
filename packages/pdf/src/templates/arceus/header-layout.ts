type HeaderCustomField = { id: string; icon: string; text: string; link: string };

type HeaderBasics = {
	email: string;
	phone: string;
	website: { url: string; label: string };
	customFields: HeaderCustomField[];
};

export type ArceusHeaderLayout = {
	leftFields: HeaderCustomField[];
	rightFields: HeaderCustomField[];
	phonePlacement: "left" | "center" | "right";
};

/**
 * Distributes header contact entries across three columns. Custom fields
 * alternate right/left; the phone lands on whichever side has fewer entries
 * (or the center column when both sides are balanced).
 */
export const getArceusHeaderLayout = (basics: HeaderBasics): ArceusHeaderLayout => {
	const leftFields = basics.customFields.filter((_, index) => index % 2 !== 0);
	const rightFields = basics.customFields.filter((_, index) => index % 2 === 0);
	const leftCount = (basics.email ? 1 : 0) + leftFields.length;
	const rightCount = (basics.website.url ? 1 : 0) + rightFields.length;

	const phonePlacement = leftCount > rightCount ? "right" : rightCount > leftCount ? "left" : "center";

	return { leftFields, rightFields, phonePlacement };
};
