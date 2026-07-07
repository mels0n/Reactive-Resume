import type { Style } from "@react-pdf/types";
import type { IconName } from "phosphor-icons-react-pdf/dynamic";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
import { useMemo } from "react";
import { rgbaStringToHex } from "@reactive-resume/utils/color";
import { Image, Page, Text as PdfText, StyleSheet, View } from "#react-pdf-renderer";
import { useRender } from "../../context";
import { getResumeSectionIcon } from "../../section-icon";
import { getResumeSectionTitle } from "../../section-title";
import { createBaseTemplateStyles } from "../shared/base-template-styles";
import { getPrimaryTint } from "../shared/color-helpers";
import {
	CustomFieldContactItem,
	EmailContactItem,
	LocationContactItem,
	PhoneContactItem,
	WebsiteContactItem,
} from "../shared/contact-item";
import { TemplateProvider } from "../shared/context";
import { filterItems, filterSections } from "../shared/filtering";
import { createApproximateMeasure, packKeywordLines } from "../shared/keyword-lines";
import { getTemplateMetrics } from "../shared/metrics";
import { getTemplatePageMinHeightStyle, getTemplatePageSize, getTemplatePageWidth } from "../shared/page-size";
import { hasTemplatePicture } from "../shared/picture";
import { Bold, Heading, Link, SectionHeadingIcon, Text } from "../shared/primitives";
import { RichText } from "../shared/rich-text";
import { createRtlStyleHelpers } from "../shared/rtl";
import { getInlineItemWebsiteUrl } from "../shared/section-links";
import { Section } from "../shared/sections";
import { hasSplitRowText } from "../shared/split-row";
import { composeStyles, headerNameLineHeight } from "../shared/styles";
import { getArceusHeaderLayout } from "./header-layout";

type ArceusStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	header: Style;
	headerName: Style;
	headerContactRow: Style;
	headerContactColumn: Style;
	headerContactColumnCenter: Style;
	headerContactColumnEnd: Style;
	headerContactItem: Style;
	banner: Style;
	bannerHeadline: Style;
	bannerTagline: Style;
	picture: Style;
	skillsBlock: Style;
	skillsLine: Style;
	educationBlock: Style;
	educationItem: Style;
	experienceBlock: Style;
	experienceItem: Style;
	experienceCompanyRow: Style;
	experienceCompany: Style;
	experienceLocation: Style;
	experienceSplitRow: Style;
	sections: Style;
};

type ArceusTemplate = {
	colors: TemplateColorRoles;
	styles: ArceusStyles;
};

export const ArceusPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata } = data;
	const { colors, styles } = useArceusTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const pageMinHeightStyle = getTemplatePageMinHeightStyle(metadata.page.format);
	const showHeader = pageIndex === 0;
	const mainSections = filterSections(page.main, data);
	const sidebarSections = page.fullWidth ? [] : filterSections(page.sidebar, data);
	const sections = [...mainSections, ...sidebarSections];

	return (
		<Page size={pageSize} style={composeStyles(styles.page, pageMinHeightStyle)}>
			<TemplateProvider styles={styles} colors={colors}>
				{showHeader && <Header styles={styles} />}

				<View style={composeStyles(styles.sections, { rowGap: metrics.sectionGap })}>
					{sections.map((section) => {
						if (section === "skills") return <ArceusSkills key={section} styles={styles} />;
						if (section === "education") return <ArceusEducation key={section} styles={styles} />;
						if (section === "experience") return <ArceusExperience key={section} styles={styles} />;
						return <Section key={section} section={section} placement="main" />;
					})}
				</View>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: { styles: ArceusStyles }) => {
	const { basics, picture } = useRender();
	const hasPicture = hasTemplatePicture(picture);
	const { leftFields, rightFields, phonePlacement } = getArceusHeaderLayout(basics);

	return (
		<View style={styles.header}>
			{hasPicture && <Image src={picture.url} style={styles.picture} />}
			<Heading style={styles.headerName}>{basics.name}</Heading>

			<View style={styles.headerContactRow}>
				<View style={styles.headerContactColumn}>
					{phonePlacement === "left" && <PhoneContactItem phone={basics.phone} style={styles.headerContactItem} />}
					<EmailContactItem email={basics.email} style={styles.headerContactItem} />
					{leftFields.map((field) => (
						<CustomFieldContactItem key={field.id} field={field} style={styles.headerContactItem} />
					))}
				</View>
				<View style={styles.headerContactColumnCenter}>
					<LocationContactItem location={basics.location} style={styles.headerContactItem} />
					{phonePlacement === "center" && <PhoneContactItem phone={basics.phone} style={styles.headerContactItem} />}
				</View>
				<View style={styles.headerContactColumnEnd}>
					{phonePlacement === "right" && <PhoneContactItem phone={basics.phone} style={styles.headerContactItem} />}
					<WebsiteContactItem website={basics.website} style={styles.headerContactItem} />
					{rightFields.map((field) => (
						<CustomFieldContactItem key={field.id} field={field} style={styles.headerContactItem} />
					))}
				</View>
			</View>

			{(basics.headline || basics.tagline) && (
				<View style={styles.banner}>
					{basics.headline && <Text style={styles.bannerHeadline}>{basics.headline}</Text>}
					{basics.tagline && <Text style={styles.bannerTagline}>{basics.tagline}</Text>}
				</View>
			)}
		</View>
	);
};

const ArceusSkills = ({ styles }: { styles: ArceusStyles }) => {
	const data = useRender();
	const { metadata } = data;
	const skills = data.sections.skills;
	const rawKeywords = skills.items
		.filter((item) => !item.hidden)
		.flatMap((item) => (item.keywords.length > 0 ? item.keywords : [item.name]))
		.filter(Boolean);
	const keywords = [...new Set(rawKeywords)];
	if (keywords.length === 0) return null;

	const metrics = getTemplateMetrics(metadata.page);
	const pageWidth = getTemplatePageWidth(metadata.page.format);
	const availableWidth = pageWidth - metrics.page.paddingHorizontal * 2;
	const measure = createApproximateMeasure(metadata.typography.body.fontSize);
	const lines = packKeywordLines(keywords, availableWidth, measure);

	return (
		<View style={styles.skillsBlock}>
			{lines.map((line) => (
				<PdfText key={line.join("|")} style={styles.skillsLine}>
					{line.join(" | ")}
				</PdfText>
			))}
		</View>
	);
};

const ArceusEducation = ({ styles }: { styles: ArceusStyles }) => {
	const data = useRender();
	const education = data.sections.education;
	const items = education.items.filter((item) => !item.hidden);
	if (items.length === 0) return null;

	const title = getResumeSectionTitle(data, "education", education.title);
	const icon = getResumeSectionIcon(data, "education");
	const showIcon = Boolean(icon) && !data.metadata.page.hideSectionIcons;

	return (
		<View style={styles.educationBlock}>
			<View style={{ flexDirection: "column", alignItems: "center" }}>
				{showIcon && <SectionHeadingIcon name={icon as IconName} />}
				<Heading style={styles.sectionHeading as Style}>{title}</Heading>
			</View>

			{items.map((item) => {
				// Reference layout: bold degree (falling back to area), then the remaining
				// fields (area, school, location) joined with commas on one centered line.
				const primary = item.degree.trim() || item.area.trim();
				const rest = [item.degree.trim() ? item.area.trim() : "", item.school.trim(), item.location.trim()]
					.filter(Boolean)
					.join(", ");

				return (
					<Text key={item.id} style={styles.educationItem}>
						<Bold>{primary}</Bold>
						{rest ? `, ${rest}` : ""}
					</Text>
				);
			})}
		</View>
	);
};

const ArceusExperience = ({ styles }: { styles: ArceusStyles }) => {
	const data = useRender();
	const experience = data.sections.experience;
	const items = filterItems(experience.items, "experience");
	if (items.length === 0) return null;

	const title = getResumeSectionTitle(data, "experience", experience.title);
	const icon = getResumeSectionIcon(data, "experience");
	const showIcon = Boolean(icon) && !data.metadata.page.hideSectionIcons;

	return (
		<View style={styles.section as Style}>
			<View style={{ flexDirection: "column", alignItems: "center" }}>
				{showIcon && <SectionHeadingIcon name={icon as IconName} />}
				<Heading style={styles.sectionHeading as Style}>{title}</Heading>
			</View>

			<View style={styles.experienceBlock}>
				{items.map((item) => {
					const inlineWebsiteUrl = getInlineItemWebsiteUrl(item.website);
					const company = <Text style={styles.experienceCompany}>{item.company.toLocaleUpperCase()}</Text>;

					return (
						<View key={item.id} style={styles.experienceItem}>
							<Text style={styles.experienceCompanyRow}>
								{inlineWebsiteUrl ? <Link src={inlineWebsiteUrl}>{company}</Link> : company}
								{hasSplitRowText(item.location) && (
									<Text style={styles.experienceLocation}>{`, ${item.location}`}</Text>
								)}
							</Text>

							{(Boolean(item.position.trim()) || hasSplitRowText(item.period)) && (
								<View style={styles.experienceSplitRow}>
									{item.position.trim() && <Bold>{item.position}</Bold>}
									{hasSplitRowText(item.period) && <Bold>{item.period}</Bold>}
								</View>
							)}

							{item.roles.length > 0 ? (
								item.roles.map((role) => (
									<View key={role.id}>
										<View style={styles.experienceSplitRow}>
											<Bold>{role.position}</Bold>
											<Bold>{role.period}</Bold>
										</View>
										<RichText>{role.description}</RichText>
									</View>
								))
							) : (
								<RichText>{item.description}</RichText>
							)}
						</View>
					);
				})}
			</View>
		</View>
	);
};

const useArceusTemplate = (): ArceusTemplate => {
	const { picture, metadata, rtl } = useRender();

	return useMemo(() => {
		const r = createRtlStyleHelpers(rtl);
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const bannerBackground = getPrimaryTint(metadata.design.colors.primary, 0.1);
		const colors: TemplateColorRoles = { foreground, background, primary };
		const metrics = getTemplateMetrics(metadata.page);
		const base = createBaseTemplateStyles({ metadata, foreground, r, metrics, picture });
		const headingWeight = metadata.typography.heading.fontWeights.at(-1) ?? "700";
		const bodyWeight = metadata.typography.body.fontWeights.at(-1) ?? "700";

		const baseStyles = StyleSheet.create({
			...base,
			page: {
				color: foreground,
				backgroundColor: background,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
				rowGap: metrics.sectionGap,
				fontFamily: metadata.typography.body.fontFamily,
				fontSize: metadata.typography.body.fontSize,
				lineHeight: metadata.typography.body.lineHeight,
				direction: r.pageDirection,
			},
			heading: { ...base.heading, fontWeight: headingWeight },
			bold: { fontWeight: bodyWeight, color: foreground },
			section: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.25),
			},
			sectionHeading: {
				color: foreground,
				fontSize: metadata.typography.heading.fontSize,
				fontWeight: headingWeight,
				textTransform: "uppercase",
				letterSpacing: 2.5,
				textAlign: "center",
			},
			sectionHeadingContainer: {
				justifyContent: "center",
			},
			sectionItems: {
				rowGap: metrics.itemGapY,
			},
			item: {
				rowGap: metrics.gapY(0.125),
			},
			levelItem: {
				borderColor: primary,
			},
			levelItemActive: {
				backgroundColor: primary,
			},
			header: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.4),
			},
			picture: {
				...base.picture,
				alignSelf: "center",
			},
			headerName: {
				color: primary,
				fontSize: metadata.typography.heading.fontSize * 1.7,
				fontWeight: headingWeight,
				lineHeight: headerNameLineHeight,
				textTransform: "uppercase",
				letterSpacing: 1.5,
				textAlign: "center",
			},
			headerContactRow: {
				flexDirection: r.row,
				justifyContent: "space-between",
				alignItems: "flex-end",
				borderBottomWidth: 2,
				borderBottomColor: primary,
				paddingBottom: metrics.gapY(0.35),
				fontSize: metadata.typography.body.fontSize * 0.92,
			},
			headerContactColumn: {
				flexDirection: "column",
				alignItems: "flex-start",
				rowGap: metrics.gapY(0.1),
			},
			headerContactColumnCenter: {
				flexDirection: "column",
				alignItems: "center",
				rowGap: metrics.gapY(0.1),
			},
			headerContactColumnEnd: {
				flexDirection: "column",
				alignItems: "flex-end",
				rowGap: metrics.gapY(0.1),
			},
			headerContactItem: {
				flexDirection: r.row,
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
				color: foreground,
			},
			banner: {
				backgroundColor: bannerBackground,
				paddingVertical: metrics.gapY(0.45),
				paddingHorizontal: metrics.gapX(0.5),
				rowGap: metrics.gapY(0.15),
			},
			bannerHeadline: {
				color: primary,
				fontSize: metadata.typography.heading.fontSize * 1.05,
				fontWeight: headingWeight,
				textTransform: "uppercase",
				letterSpacing: 1,
				textAlign: "center",
			},
			bannerTagline: {
				color: foreground,
				fontWeight: bodyWeight,
				textAlign: "center",
			},
			skillsBlock: {
				rowGap: metrics.gapY(0.1),
			},
			skillsLine: {
				textAlign: "center",
			},
			educationBlock: {
				flexDirection: "column",
				alignItems: "center",
				rowGap: metrics.gapY(0.2),
			},
			educationItem: {
				textAlign: "center",
			},
			experienceBlock: {
				flexDirection: "column",
				rowGap: metrics.itemGapY,
			},
			experienceItem: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.125),
			},
			experienceCompanyRow: {
				textAlign: r.sectionHeadingTextAlign,
				...r.text,
			},
			experienceCompany: {
				color: primary,
				fontWeight: bodyWeight,
				textTransform: "uppercase",
			},
			experienceLocation: {
				color: foreground,
				fontWeight: "normal",
				textTransform: "none",
			},
			experienceSplitRow: {
				flexDirection: r.row,
				justifyContent: "space-between",
				alignItems: "flex-start",
			},
			sections: {
				flexDirection: "column",
			},
		});

		const accentFor = ({ colors }: TemplateStyleContext) => colors.primary;

		return {
			colors,
			styles: {
				...baseStyles,
				levelItem: (context) => ({ borderColor: accentFor(context) }),
				levelItemActive: (context) => ({ backgroundColor: accentFor(context) }),
				icon: (context) => ({
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: accentFor(context),
				}),
			} satisfies ArceusStyles,
		};
	}, [picture, metadata, rtl]);
};
