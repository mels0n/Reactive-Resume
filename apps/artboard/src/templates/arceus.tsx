import type {
    Accomplishment,
    Award,
    Certification,
    CustomSection,
    CustomSectionGroup,
    Interest,
    Language,
    Profile,
    Project,
    Publication,
    Reference,
    SectionKey,
    SectionWithItem,
    Skill,
    URL,
} from "@reactive-resume/schema";
import type { Education as EducationType, Experience as ExperienceType, Volunteer as VolunteerType } from "@reactive-resume/schema";
import { cn, isEmptyString, isUrl, sanitize } from "@reactive-resume/utils";
import get from "lodash.get";
import { Fragment, useLayoutEffect, useRef, useState } from "react";

import { BrandIcon } from "../components/brand-icon";
import { Picture } from "../components/picture";
import { useArtboardStore } from "../store/artboard";
import type { TemplateProps } from "../types/template";

type RatingProps = { level: number };

const Rating = ({ level }: RatingProps) => (
    <div className="flex items-center gap-x-1.5">
        {Array.from({ length: 5 }).map((_, index) => (
            <div
                key={index}
                className={cn("size-2 rounded-full border border-primary", level > index && "bg-primary")}
            />
        ))}
    </div>
);

type LinkProps = {
    url: URL;
    icon?: React.ReactNode;
    iconOnRight?: boolean;
    label?: string;
    className?: string;
};

const Link = ({ url, icon, iconOnRight, label, className }: LinkProps) => {
    if (!isUrl(url.href)) return null;

    return (
        <div className="flex items-center gap-x-1.5 break-all border-r pr-2 last:border-r-0 last:pr-0">
            {!iconOnRight && (icon ?? <i className="ph ph-bold ph-link text-primary" />)}
            <a
                href={url.href}
                target="_blank"
                rel="noreferrer noopener nofollow"
                className={cn("line-clamp-1 max-w-fit", className)}
            >
                {label ?? (url.label || url.href)}
            </a>
            {iconOnRight && (icon ?? <i className="ph ph-bold ph-link text-primary" />)}
        </div>
    );
};

type LinkedEntityProps = {
    name: string;
    url: URL;
    separateLinks: boolean;
    className?: string;
};

const LinkedEntity = ({ name, url, separateLinks, className }: LinkedEntityProps) => {
    return !separateLinks && isUrl(url.href) ? (
        <Link
            url={url}
            label={name}
            icon={<i className="ph ph-bold ph-globe text-primary" />}
            iconOnRight={true}
            className={className}
        />
    ) : (
        <div className={className}>{name}</div>
    );
};

const Header = () => {
    const basics = useArtboardStore((state) => state.resume.basics);

    return (
        <div className="flex flex-col space-y-4">
            {/* Row 1: Name Centered */}
            <div className="text-center">
                <div className="text-3xl font-bold uppercase tracking-widest text-primary">{basics.name}</div>
            </div>

            {/* Row 2: Contact Info */}
            <div className="flex items-end justify-between border-b-2 border-primary pb-2 text-sm">
                {/* Left: Email & Odd Custom Fields */}
                <div className="flex flex-1 flex-col items-start text-left">
                    {(() => {
                        const leftCount = (basics.email ? 1 : 0) + basics.customFields.filter((_, i) => i % 2 !== 0).length;
                        const rightCount = (isUrl(basics.url.href) ? 1 : 0) + basics.customFields.filter((_, i) => i % 2 === 0).length;
                        const phonePosition = leftCount > rightCount ? "right" : rightCount > leftCount ? "left" : "center";

                        return (
                            <>
                                {phonePosition === "left" && basics.phone && (
                                    <a href={`tel:${basics.phone}`}>{basics.phone}</a>
                                )}
                                {basics.email && (
                                    <a href={`mailto:${basics.email}`}>
                                        {basics.email}
                                    </a>
                                )}
                                {basics.customFields.map((item, index) => {
                                    if (index % 2 === 0) return null; // Skip even indices (Right side)

                                    return (
                                        <div key={item.id}>
                                            <a
                                                href={item.value}
                                                target="_blank"
                                                rel="noreferrer noopener nofollow"
                                            >
                                                {item.name || item.value}
                                            </a>
                                        </div>
                                    );
                                })}
                            </>
                        );
                    })()}
                </div>

                {/* Center: Location & Phone */}
                <div className="flex flex-col items-center justify-center text-center self-start">
                    {basics.location && <div>{basics.location}</div>}
                    {(() => {
                        const leftCount = (basics.email ? 1 : 0) + basics.customFields.filter((_, i) => i % 2 !== 0).length;
                        const rightCount = (isUrl(basics.url.href) ? 1 : 0) + basics.customFields.filter((_, i) => i % 2 === 0).length;
                        const phonePosition = leftCount > rightCount ? "right" : rightCount > leftCount ? "left" : "center";

                        if (phonePosition === "center" && basics.phone) {
                            return <a href={`tel:${basics.phone}`}>{basics.phone}</a>;
                        }
                        return null;
                    })()}
                </div>

                {/* Right: Website & Even Custom Fields */}
                <div className="flex flex-1 flex-col items-end text-right">
                    {(() => {
                        const leftCount = (basics.email ? 1 : 0) + basics.customFields.filter((_, i) => i % 2 !== 0).length;
                        const rightCount = (isUrl(basics.url.href) ? 1 : 0) + basics.customFields.filter((_, i) => i % 2 === 0).length;
                        const phonePosition = leftCount > rightCount ? "right" : rightCount > leftCount ? "left" : "center";

                        return (
                            <>
                                {phonePosition === "right" && basics.phone && (
                                    <a href={`tel:${basics.phone}`}>{basics.phone}</a>
                                )}
                                {isUrl(basics.url.href) && (
                                    <a
                                        href={basics.url.href}
                                        target="_blank"
                                        rel="noreferrer noopener nofollow"
                                    >
                                        {basics.url.label || basics.url.href}
                                    </a>
                                )}
                                {basics.customFields.map((item, index) => {
                                    if (index % 2 !== 0) return null; // Skip odd indices (Left side)

                                    return (
                                        <div key={item.id}>
                                            <a
                                                href={item.value}
                                                target="_blank"
                                                rel="noreferrer noopener nofollow"
                                            >
                                                {item.name || item.value}
                                            </a>
                                        </div>
                                    );
                                })}
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Row 3: Headline & Tagline */}
            <div className="relative py-3 text-center">
                <div className="absolute inset-0 bg-primary opacity-10" />
                <div className="relative">
                    <div className="text-xl font-bold uppercase tracking-widest text-primary">
                        {basics.headline}
                    </div>
                    {basics.tagline && (
                        <div className="mt-1 text-base font-bold text-primary/80">
                            {basics.tagline}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Summary = () => {
    const section = useArtboardStore((state) => state.resume.sections.summary);

    if (!section.visible || isEmptyString(section.content)) return null;

    return (
        <section id={section.id}>


            <div
                dangerouslySetInnerHTML={{ __html: sanitize(section.content) }}
                style={{ columns: section.columns }}
                className="wysiwyg text-center"
            />
        </section>
    );
};



type SectionProps<T> = {
    section: SectionWithItem<T> | CustomSectionGroup;
    children?: (item: T) => React.ReactNode;
    className?: string;
    urlKey?: keyof T;
    levelKey?: keyof T;
    summaryKey?: keyof T;
    keywordsKey?: keyof T;
    keywordSeparator?: string;
    hideTitle?: boolean;
    containerClassName?: string;
};

const Section = <T,>({
    section,
    children,
    className,
    urlKey,
    levelKey,
    summaryKey,
    keywordsKey,
    keywordSeparator = ", ",
    hideTitle = false,
    containerClassName,
    itemsClassName,
}: SectionProps<T> & { itemsClassName?: string }) => {
    if (!section.visible || section.items.filter((item) => item.visible).length === 0) return null;

    return (
        <section id={section.id} className={cn("grid", containerClassName)}>
            {!!section.name && !hideTitle && (
                <h4 className="mb-2 text-center text-xl font-bold uppercase tracking-widest">
                    {section.name}
                </h4>
            )}

            <div
                className={cn("grid gap-x-6 gap-y-3", itemsClassName)}
                style={{ gridTemplateColumns: `repeat(${section.columns}, 1fr)` }}
            >
                {section.items
                    .filter((item) => item.visible)
                    .map((item) => {
                        const url = (urlKey && get(item, urlKey)) as URL | undefined;
                        const level = (levelKey && get(item, levelKey, 0)) as number | undefined;
                        const summary = (summaryKey && get(item, summaryKey, "")) as string | undefined;
                        const keywords = (keywordsKey && get(item, keywordsKey, [])) as string[] | undefined;

                        return (
                            <div key={item.id} className={cn("space-y-2", className)}>
                                <div>
                                    {children?.(item as T)}
                                    {url !== undefined && section.separateLinks && <Link url={url} />}
                                </div>

                                {summary !== undefined && !isEmptyString(summary) && (
                                    <div
                                        dangerouslySetInnerHTML={{ __html: sanitize(summary) }}
                                        className="wysiwyg"
                                    />
                                )}

                                {level !== undefined && level > 0 && <Rating level={level} />}

                                {keywords !== undefined && keywords.length > 0 && (
                                    <p className="text-sm">{keywords.join(keywordSeparator)}</p>
                                )}
                            </div>
                        );
                    })}
            </div>
        </section>
    );
};

const Profiles = () => {
    const section = useArtboardStore((state) => state.resume.sections.profiles);

    return (
        <Section<Profile> section={section}>
            {(item) => (
                <div>
                    {isUrl(item.url.href) ? (
                        <Link url={item.url} label={item.username} icon={<BrandIcon slug={item.icon} />} />
                    ) : (
                        <p>{item.username}</p>
                    )}
                    {!item.icon && <p className="text-sm">{item.network}</p>}
                </div>
            )}
        </Section>
    );
};

const Experience = () => {
    const section = useArtboardStore((state) => state.resume.sections.experience);

    return (
        <Section<ExperienceType> section={section} urlKey="url" summaryKey="summary">
            {(item) => (
                <div className="flex flex-col">
                    <div className="flex items-center text-left">
                        <LinkedEntity
                            name={item.company}
                            url={item.url}
                            separateLinks={section.separateLinks}
                            className="text-primary uppercase font-bold"
                        />
                        {item.location && <span className="text-foreground normal-case">, {item.location}</span>}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="font-bold">{item.position}</div>
                        <div className="font-bold">{item.date}</div>
                    </div>
                </div>
            )}
        </Section>
    );
};

const Education = () => {
    const section = useArtboardStore((state) => state.resume.sections.education);

    return (
        <Section<EducationType> section={section} urlKey="url" itemsClassName="gap-y-0">
            {(item) => {
                const area = item.area;
                const studyType = item.studyType;
                const institution = item.institution;
                const summary = item.summary;
                const date = item.date;

                const InstitutionContent = () => {
                    if (!section.separateLinks && isUrl(item.url.href)) {
                        return (
                            <a
                                href={item.url.href}
                                target="_blank"
                                rel="noreferrer noopener nofollow"
                            >
                                {institution}
                                <i className="ph ph-bold ph-globe ml-1 text-primary" />
                            </a>
                        );
                    }
                    return <span>{institution}</span>;
                };

                const fields = [
                    { value: area, content: area },
                    { value: studyType, content: studyType },
                    {
                        value: institution,
                        content: <InstitutionContent />,
                    },
                    {
                        value: summary,
                        content: summary ? (
                            <span
                                dangerouslySetInnerHTML={{ __html: sanitize(summary) }}
                                className="[&_p]:inline"
                            />
                        ) : null
                    },
                    { value: date, content: date },
                ].filter((f) => !isEmptyString(f.value));

                return (
                    <div className="text-center leading-relaxed">
                        {fields.map((field, index) => (
                            <Fragment key={index}>
                                <span className={cn(index === 0 && "font-bold")}>
                                    {field.content}
                                </span>
                                {index < fields.length - 1 && <span>, </span>}
                            </Fragment>
                        ))}
                    </div>
                );
            }}
        </Section>
    );
};

const Awards = () => {
    const section = useArtboardStore((state) => state.resume.sections.awards);

    return (
        <Section<Award> section={section} urlKey="url" summaryKey="summary">
            {(item) => (
                <div className="flex items-start justify-between">
                    <div className="text-left">
                        <div className="font-bold">{item.title}</div>
                        <LinkedEntity
                            name={item.awarder}
                            url={item.url}
                            separateLinks={section.separateLinks}
                        />
                    </div>

                    <div className="shrink-0 text-right">
                        <div className="font-bold">{item.date}</div>
                    </div>
                </div>
            )}
        </Section>
    );
};

const Certifications = () => {
    const section = useArtboardStore((state) => state.resume.sections.certifications);

    return (
        <Section<Certification> section={section} urlKey="url" summaryKey="summary">
            {(item) => (
                <div className="flex items-start justify-between">
                    <div className="text-left">
                        <div className="font-bold">{item.name}</div>
                        <LinkedEntity name={item.issuer} url={item.url} separateLinks={section.separateLinks} />
                    </div>

                    <div className="shrink-0 text-right">
                        <div className="font-bold">{item.date}</div>
                    </div>
                </div>
            )}
        </Section>
    );
};

const OptimizedKeywords = ({ keywords }: { keywords: string[] }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [lines, setLines] = useState<string[][]>([]);

    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const computeLayout = () => {
            const containerWidth = container.getBoundingClientRect().width;
            if (containerWidth === 0) return;

            const computedStyle = getComputedStyle(container);
            const font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) return;
            context.font = font;

            const separator = " | ";
            const separatorWidth = context.measureText(separator).width;

            // Measure all keywords
            const measuredKeywords = keywords.map((k) => ({
                text: k,
                width: context.measureText(k).width,
            }));

            // Sort by width descending (First Fit Decreasing)
            measuredKeywords.sort((a, b) => b.width - a.width);

            const newLines: string[][] = [];
            const lineWidths: number[] = [];

            measuredKeywords.forEach(({ text, width }) => {
                let added = false;

                // Try to fit in existing lines
                for (let i = 0; i < newLines.length; i++) {
                    const currentWidth = lineWidths[i];
                    // If line is not empty, add separator width
                    const widthToAdd = (newLines[i].length > 0 ? separatorWidth : 0) + width;

                    if (currentWidth + widthToAdd <= containerWidth) {
                        newLines[i].push(text);
                        lineWidths[i] += widthToAdd;
                        added = true;
                        break;
                    }
                }

                if (!added) {
                    newLines.push([text]);
                    lineWidths.push(width);
                }
            });

            setLines(newLines);
        };

        const observer = new ResizeObserver(computeLayout);
        observer.observe(container);

        // Wait for fonts to ensure accurate measurement
        document.fonts.ready.then(computeLayout);

        return () => observer.disconnect();
    }, [keywords]);

    return (
        <div ref={containerRef} className="w-full">
            {lines.length > 0 ? (
                lines.map((line, index) => (
                    <div key={index} className="whitespace-nowrap">
                        {line.join(" | ")}
                    </div>
                ))
            ) : (
                <div className="opacity-0 pointer-events-none absolute">{keywords.join(" | ")}</div>
            )}
        </div>
    );
};

const Skills = () => {
    const section = useArtboardStore((state) => state.resume.sections.skills);

    return (
        <Section<Skill>
            section={section}
            className="text-center"
            hideTitle
        >
            {(item) => (
                <div className="space-y-1">
                    {item.keywords && item.keywords.length > 0 && (
                        <div className="text-center">
                            <OptimizedKeywords keywords={item.keywords} />
                        </div>
                    )}
                </div>
            )}
        </Section>
    );
};

const Interests = () => {
    const section = useArtboardStore((state) => state.resume.sections.interests);

    return (
        <Section<Interest> section={section} keywordsKey="keywords" className="space-y-0.5">
            {(item) => <div className="font-bold">{item.name}</div>}
        </Section>
    );
};

const Publications = () => {
    const section = useArtboardStore((state) => state.resume.sections.publications);

    return (
        <Section<Publication> section={section} urlKey="url" summaryKey="summary">
            {(item) => (
                <div className="flex items-start justify-between">
                    <div className="text-left">
                        <LinkedEntity
                            name={item.name}
                            url={item.url}
                            separateLinks={section.separateLinks}
                            className="font-bold"
                        />
                        <div>{item.publisher}</div>
                    </div>

                    <div className="shrink-0 text-right">
                        <div className="font-bold">{item.date}</div>
                    </div>
                </div>
            )}
        </Section>
    );
};

const Volunteer = () => {
    const section = useArtboardStore((state) => state.resume.sections.volunteer);

    return (
        <Section<VolunteerType> section={section} urlKey="url" summaryKey="summary">
            {(item) => (
                <div className="flex items-start justify-between">
                    <div className="text-left">
                        <LinkedEntity
                            name={item.organization}
                            url={item.url}
                            separateLinks={section.separateLinks}
                            className="font-bold"
                        />
                        <div>{item.position}</div>
                    </div>

                    <div className="shrink-0 text-right">
                        <div className="font-bold">{item.date}</div>
                        <div>{item.location}</div>
                    </div>
                </div>
            )}
        </Section>
    );
};

const Languages = () => {
    const section = useArtboardStore((state) => state.resume.sections.languages);

    return (
        <Section<Language> section={section} levelKey="level">
            {(item) => (
                <div className="space-y-0.5">
                    <div className="font-bold">{item.name}</div>
                    <div>{item.description}</div>
                </div>
            )}
        </Section>
    );
};

const Projects = () => {
    const section = useArtboardStore((state) => state.resume.sections.projects);

    return (
        <Section<Project> section={section} urlKey="url" summaryKey="summary" keywordsKey="keywords">
            {(item) => (
                <div className="flex items-start justify-between">
                    <div className="text-left">
                        <LinkedEntity
                            name={item.name}
                            url={item.url}
                            separateLinks={section.separateLinks}
                            className="font-bold"
                        />
                        <div>{item.description}</div>
                    </div>

                    <div className="shrink-0 text-right">
                        <div className="font-bold">{item.date}</div>
                    </div>
                </div>
            )}
        </Section>
    );
};

const References = () => {
    const section = useArtboardStore((state) => state.resume.sections.references);

    return (
        <Section<Reference> section={section} urlKey="url" summaryKey="summary">
            {(item) => (
                <div>
                    <LinkedEntity
                        name={item.name}
                        url={item.url}
                        separateLinks={section.separateLinks}
                        className="font-bold"
                    />
                    <div>{item.description}</div>
                </div>
            )}
        </Section>
    );
};

const Accomplishments = () => {
    const section = useArtboardStore((state) => state.resume.sections.accomplishments);

    if (!section) return null;

    return (
        <Section<Accomplishment> section={section} summaryKey="summary">
            {(item) => <div className="font-bold">{item.name}</div>}
        </Section>
    );
};



const Custom = ({ id }: { id: string }) => {
    const section = useArtboardStore((state) => state.resume.sections.custom[id]);

    if (!section) return null;

    const isTagline = section.name.toLowerCase() === "tagline";

    return (
        <Section<CustomSection>
            section={section}
            urlKey="url"
            summaryKey="summary"
            keywordsKey="keywords"
            hideTitle={isTagline}
            className={isTagline ? "text-center" : undefined}
            containerClassName={isTagline ? "!mt-0" : undefined}
        >
            {(item) => (

                <div className={cn("flex items-start justify-between", isTagline && "flex-col items-center justify-center")}>
                    <div className={cn("text-left", isTagline && "text-center")}>
                        <LinkedEntity
                            name={item.name}
                            url={item.url}
                            separateLinks={section.separateLinks}
                            className={cn("font-bold", isTagline && "font-normal text-sm")}
                        />
                        <div>{item.description}</div>
                    </div>

                    <div className={cn("shrink-0 text-right", isTagline && "hidden")}>
                        <div className="font-bold">{item.date}</div>
                        <div>{item.location}</div>
                    </div>
                </div>
            )}
        </Section>
    );
};

const mapSectionToComponent = (section: SectionKey) => {
    switch (section) {
        case "profiles": {
            return <Profiles />;
        }
        case "summary": {
            return <Summary />;
        }
        case "experience": {
            return <Experience />;
        }
        case "education": {
            return <Education />;
        }
        case "awards": {
            return <Awards />;
        }
        case "certifications": {
            return <Certifications />;
        }
        case "skills": {
            return <Skills />;
        }
        case "interests": {
            return <Interests />;
        }
        case "publications": {
            return <Publications />;
        }
        case "volunteer": {
            return <Volunteer />;
        }
        case "languages": {
            return <Languages />;
        }
        case "projects": {
            return <Projects />;
        }
        case "references": {
            return <References />;
        }
        case "accomplishments": {
            return <Accomplishments />;
        }

        default: {
            if (section.startsWith("custom.")) return <Custom id={section.split(".")[1]} />;

            return null;
        }
    }
};

export const Arceus = ({ columns, isFirstPage = false }: TemplateProps) => {
    const [main, sidebar] = columns;

    return (
        <div className="space-y-4 p-custom">
            {isFirstPage && <Header />}

            {main.map((section) => (
                <Fragment key={section}>{mapSectionToComponent(section)}</Fragment>
            ))}

            {sidebar &&
                sidebar.map((section) => (
                    <Fragment key={section}>{mapSectionToComponent(section)}</Fragment>
                ))}
        </div>
    );
};
