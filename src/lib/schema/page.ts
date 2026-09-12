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

export const BookingFormSectionSchema = z.object({
  headline: z.string().default("Book the Eagleburger Band"),
  subheadline: z.string().default("Bring mobile acoustic brass and high-energy drumline grooves to your festival, parade, or celebration."),
  badgeText: z.string().default("Direct Event Inquiry"),
  defaultEventType: z.string().default("Community Parade & Festival"),
  buttonText: z.string().default("Submit Booking Inquiry"),
});

export const TestimonialItemSchema = z.object({
  quote: z.string().default(""),
  author: z.string().default(""),
  roleOrEvent: z.string().default(""),
  rating: z.number().default(5),
});

export const TestimonialsSectionSchema = z.object({
  title: z.string().default("What Organizers & Audiences Say"),
  subtitle: z.string().default("From parade routes to street festivals, hear the crowd reaction."),
  items: z.array(TestimonialItemSchema).default(() => [
    {
      quote: "The Eagleburger Band brought unmatched energy to our parade. People were dancing in the streets!",
      author: "Sarah M.",
      roleOrEvent: "Community Festival Coordinator",
      rating: 5,
    },
    {
      quote: "Completely acoustic and mobile. They marched right through the crowd and blew everyone away.",
      author: "David R.",
      roleOrEvent: "Art Festival Director",
      rating: 5,
    },
  ]),
});

export const FaqItemSchema = z.object({
  question: z.string().default(""),
  answer: z.string().default(""),
  category: z.string().default("General"),
});

export const FaqSectionSchema = z.object({
  title: z.string().default("Frequently Asked Questions"),
  subtitle: z.string().default("Everything you need to know about booking and performance logistics."),
  items: z.array(FaqItemSchema).default(() => [
    {
      question: "Do you need electrical outlets or a stage?",
      answer: "None! The Eagleburger Band is 100% mobile and acoustic. We perform anywhere — streets, lawns, pavilions, stairwells, and parade routes.",
      category: "Logistics",
    },
    {
      question: "How large is the ensemble?",
      answer: "We typically march with 15 to 25 musicians featuring full brass (trumpets, trombones, sousaphones, saxophones) and a high-impact drumline battery.",
      category: "Ensemble",
    },
    {
      question: "How far in advance should we book?",
      answer: "For summer parades and festival weekends, booking 2 to 6 months in advance is recommended. However, we always welcome inquiries for upcoming events.",
      category: "Booking",
    },
  ]),
});

export const CtaBannerSectionSchema = z.object({
  headline: z.string().default("Ready to Bring Unstoppable Brass Energy to Your Event?"),
  subheadline: z.string().default("Inquire today to check musician availability, rates, and custom parade setlists."),
  buttonText: z.string().default("Book the Band Now"),
  buttonHref: z.string().default("/book"),
  secondaryButtonText: z.string().default("View Schedule"),
  secondaryButtonHref: z.string().default("/gigs"),
  badgeText: z.string().default("Live Street Brass"),
  variant: z.enum(["primary", "dark", "gradient"]).default("primary"),
});

export const StatsMetricSchema = z.object({
  value: z.string().default("100%"),
  label: z.string().default("Acoustic & Mobile"),
  description: z.string().default("Zero wires or power needed"),
});

export const StatsCounterSectionSchema = z.object({
  title: z.string().default("By the Numbers"),
  subtitle: z.string().default("Pittsburgh's most dynamic street brass sound."),
  metrics: z.array(StatsMetricSchema).default(() => [
    { value: "100%", label: "Acoustic & Mobile", description: "Zero cables or outlets required" },
    { value: "50+", label: "Parades & Festivals", description: "Across Western Pennsylvania" },
    { value: "25+", label: "Active Musicians", description: "Horns, saxes, sousaphones & battery" },
    { value: "10K+", label: "Smiles Brought", description: "Dancing crowds at every downbeat" },
  ]),
});

export const SectionTypeEnum = z.enum([
  "hero",
  "rich_text",
  "media_highlight",
  "features",
  "gig_feed_preview",
  "booking_form",
  "testimonials",
  "faq",
  "cta_banner",
  "stats_counter",
]);

export const ContentSectionSchema = z.object({
  id: z.string(),
  type: SectionTypeEnum,
  order: z.number().default(0),
  isVisible: z.boolean().default(true),
  background: z.enum(["default", "surface", "gradient", "muted"]).default("default"),
  padding: z.enum(["compact", "standard", "generous"]).default("standard"),
  hero: HeroSectionSchema.optional(),
  richText: RichTextSectionSchema.optional(),
  mediaHighlight: MediaHighlightSectionSchema.optional(),
  features: FeaturesSectionSchema.optional(),
  gigFeedPreview: GigFeedPreviewSectionSchema.optional(),
  bookingForm: BookingFormSectionSchema.optional(),
  testimonials: TestimonialsSectionSchema.optional(),
  faq: FaqSectionSchema.optional(),
  ctaBanner: CtaBannerSectionSchema.optional(),
  statsCounter: StatsCounterSectionSchema.optional(),
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
