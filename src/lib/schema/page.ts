import { z } from "zod";

export const HeroSectionSchema = z.object({
  headline: z.string().default("Pittsburgh's High-Energy Mobile Brass & Drum Powerhouse"),
  subheadline: z.string().default("Parades, festivals, and unforgettable acoustic street brass revelry."),
  ctaText: z.string().default("Book the Band"),
  ctaHref: z.string().default("/book"),
  secondaryCtaText: z.string().default("Upcoming Shows"),
  secondaryCtaHref: z.string().default("/gigs"),
  badgeText: z.string().default("Acoustic Brass & Drums"),
  backgroundImageUrl: z.string().default(""),
});

export const RichTextSectionSchema = z.object({
  title: z.string().default(""),
  body: z.string().default(""),
  alignment: z.enum(["left", "center"]).default("left"),
  stylePreset: z.enum(["standard", "callout", "prose_card"]).default("standard"),
});

export const MediaHighlightSectionSchema = z.object({
  title: z.string().default("Live in Action"),
  description: z.string().default("Catch the raw energy of the brass line and drum battery marching the streets."),
  mediaType: z.enum(["youtube", "image"]).default("youtube"),
  url: z.string().default("https://www.youtube.com/watch?v=v0x-fut30wE"),
  caption: z.string().default("Greenfield Holiday Parade Performance"),
});

export const FeatureItemSchema = z.object({
  icon: z.string().default("Music"),
  title: z.string().default(""),
  description: z.string().default(""),
});

export const FeaturesSectionSchema = z.object({
  title: z.string().default("Why Book the Eagleburger Band?"),
  subtitle: z.string().default("Mobile, acoustic, and always electrifying."),
  items: z.array(FeatureItemSchema).default(() => [
    {
      icon: "Zap",
      title: "100% Mobile & Acoustic",
      description: "No stage, cables, or outlets required. We march, dance, and blow the roof off anywhere.",
    },
    {
      icon: "Drum",
      title: "Full Brass & Drumline Battery",
      description: "Sousaphones, trombones, trumpets, saxes, and pounding drums that move the crowd.",
    },
    {
      icon: "Users",
      title: "Community & Event Focused",
      description: "Parades, street fairs, block parties, weddings, and corporate celebrations.",
    },
  ]),
});

export const GigFeedPreviewSectionSchema = z.object({
  title: z.string().default("Upcoming Performances"),
  maxItems: z.number().default(3),
  ctaText: z.string().default("View Full Performance Schedule"),
  ctaHref: z.string().default("/gigs"),
});

export const SectionTypeEnum = z.enum([
  "hero",
  "rich_text",
  "media_highlight",
  "features",
  "gig_feed_preview",
]);

export const ContentSectionSchema = z.object({
  id: z.string(),
  type: SectionTypeEnum,
  order: z.number().default(0),
  hero: HeroSectionSchema.optional(),
  richText: RichTextSectionSchema.optional(),
  mediaHighlight: MediaHighlightSectionSchema.optional(),
  features: FeaturesSectionSchema.optional(),
  gigFeedPreview: GigFeedPreviewSectionSchema.optional(),
});

export const PageSeoSchema = z.object({
  metaTitle: z.string().default(""),
  metaDescription: z.string().default(""),
  keywords: z.string().default(""),
  ogImageUrl: z.string().default(""),
  ogType: z.enum(["website", "article", "music.band"]).default("website"),
  canonicalUrl: z.string().default(""),
  noIndex: z.boolean().default(false),
  noFollow: z.boolean().default(false),
  structuredDataType: z.enum(["none", "MusicGroup", "WebPage", "Event", "custom"]).default("WebPage"),
  structuredDataJson: z.string().default(""),
});

export const ContentPageSchema = z.object({
  id: z.string().default("home"),
  slug: z.string().default("home"),
  title: z.string().default("Home"),
  description: z.string().default("The Official Website of the Eagleburger Band"),
  isPublished: z.boolean().default(true),
  seo: PageSeoSchema.default(() => PageSeoSchema.parse({})),
  sections: z.array(ContentSectionSchema).default(() => []),
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type SectionType = z.infer<typeof SectionTypeEnum>;
export type ContentSection = z.infer<typeof ContentSectionSchema>;
export type PageSeo = z.infer<typeof PageSeoSchema>;
export type ContentPage = z.infer<typeof ContentPageSchema>;
