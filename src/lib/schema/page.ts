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
  subtitle: z.string().default("Catch the Eagleburger Band live on the streets and stages of Pittsburgh"),
  maxItems: z.number().default(3),
  showVenueAddress: z.boolean().default(true),
  showTicketLinks: z.boolean().default(true),
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
  avatarUrl: z.string().default(""),
  tag: z.string().default("Community Event"),
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
      avatarUrl: "",
      tag: "Parade",
    },
    {
      quote: "Completely acoustic and mobile. They marched right through the crowd and blew everyone away.",
      author: "David R.",
      roleOrEvent: "Art Festival Director",
      rating: 5,
      avatarUrl: "",
      tag: "Street Festival",
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
  buttonStyle: z.enum(["solid-yellow", "white", "outline"]).default("solid-yellow"),
  secondaryButtonText: z.string().default("View Schedule"),
  secondaryButtonHref: z.string().default("/gigs"),
  secondaryButtonStyle: z.enum(["solid-yellow", "white", "outline"]).default("outline"),
  badgeText: z.string().default("Live Street Brass"),
  variant: z.enum(["primary", "dark", "gradient", "forest"]).default("primary"),
});

export const StatsMetricSchema = z.object({
  value: z.string().default("100%"),
  label: z.string().default("Acoustic & Mobile"),
  description: z.string().default("Zero wires or power needed"),
  icon: z.string().default("Award"),
});

export const StatsCounterSectionSchema = z.object({
  title: z.string().default("By the Numbers"),
  subtitle: z.string().default("Pittsburgh's most dynamic street brass sound."),
  metrics: z.array(StatsMetricSchema).default(() => [
    { value: "100%", label: "Acoustic & Mobile", description: "Zero cables or outlets required", icon: "Award" },
    { value: "50+", label: "Parades & Festivals", description: "Across Western Pennsylvania", icon: "Calendar" },
    { value: "25+", label: "Active Musicians", description: "Horns, saxes, sousaphones & battery", icon: "Users" },
    { value: "10K+", label: "Smiles Brought", description: "Dancing crowds at every downbeat", icon: "Sparkles" },
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

export const PageHeaderImageSchema = z.object({
  imageUrl: z.string().default(""),
  altText: z.string().default(""),
  overlayOpacity: z.number().min(0).max(100).default(50),
  headlineAlignment: z.enum(["left", "center", "right"]).default("center"),
  heightPreset: z.enum(["compact", "standard", "cinematic"]).default("standard"),
  verticalPosition: z.number().min(0).max(100).default(50), // 0% = Top, 50% = Middle, 100% = Bottom
  badgeText: z.string().default(""),
  customTitle: z.string().default(""),
  customSubtitle: z.string().default(""),
});

export const ContentPageSchema = z.object({
  id: z.string().default("home"),
  slug: z.string().default("home"),
  title: z.string().default("Home"),
  description: z.string().default("The Official Website of the Eagleburger Band"),
  isPublished: z.boolean().default(true),
  headerImage: PageHeaderImageSchema.default(() => PageHeaderImageSchema.parse({})),
  seo: PageSeoSchema.default(() => PageSeoSchema.parse({})),
  sections: z.array(ContentSectionSchema).default(() => []),
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type SectionType = z.infer<typeof SectionTypeEnum>;
export type ContentSection = z.infer<typeof ContentSectionSchema>;
export type PageSeo = z.infer<typeof PageSeoSchema>;
export type PageHeaderImage = z.infer<typeof PageHeaderImageSchema>;
export type ContentPage = z.infer<typeof ContentPageSchema>;

export const SYSTEM_PAGE_IDS = [
  "home",
  "gigs",
  "book",
  "join",
  "testimonials",
  "giving",
  "contact",
] as const;

export type SystemPageId = (typeof SYSTEM_PAGE_IDS)[number];

export const DEFAULT_SYSTEM_PAGES: Record<SystemPageId, ContentPage> = {
  home: ContentPageSchema.parse({
    id: "home",
    slug: "home",
    title: "Home",
    description: "The Eagleburger Band brings high-energy acoustic street brass and drum powerhouse excitement to parades, festivals, and celebrations across Western PA.",
    isPublished: true,
    headerImage: {
      imageUrl: "",
      altText: "",
      overlayOpacity: 55,
      headlineAlignment: "center",
      heightPreset: "cinematic",
      badgeText: "Acoustic Brass & Percussion Battery",
      customTitle: "EAGLEBURGER BAND",
      customSubtitle: "Pittsburgh's High-Energy Mobile Brass & Drum Powerhouse",
      verticalPosition: 50,
    },
    seo: {
      metaTitle: "Eagleburger Band | Pittsburgh High-Energy Street Brass",
      metaDescription: "The Eagleburger Band brings high-energy acoustic street brass and drum powerhouse excitement to parades, festivals, and celebrations across Western PA.",
      keywords: "brass band, pittsburgh street music, mobile brass, parade band, live music pittsburgh",
      structuredDataType: "MusicGroup",
    },
    sections: [
      {
        id: "sec_hero",
        type: "hero",
        order: 1,
        hero: {
          headline: "Pittsburgh's High-Energy Street Brass & Drum Powerhouse",
          subheadline: "Unstoppable brass fanfares, infectious street percussion, and high-stepping street revelry across Western Pennsylvania.",
          ctaText: "Book the Band",
          ctaHref: "/book",
          secondaryCtaText: "Upcoming Shows",
          secondaryCtaHref: "/gigs",
          badgeText: "Acoustic Brass & Drums",
          backgroundImageUrl: "",
        },
      },
      {
        id: "sec_media",
        type: "media_highlight",
        order: 2,
        mediaHighlight: {
          title: "Live on the March",
          description: "Watch the Eagleburger Band bring the energy to Millvale Music Festival - possibly for the last time!",
          mediaType: "youtube",
          url: "https://www.youtube.com/watch?v=dNK6hFhC-D8",
          caption: "2025 Millvale Music Festival — Brass & Battery & Fire in the Ravine",
        },
      },
      {
        id: "sec_features",
        type: "features",
        order: 3,
        features: {
          title: "Why Book the Eagleburger Band?",
          subtitle: "Mobile, acoustic, and always electrifying.",
          items: [
            {
              icon: "Zap",
              title: "100% Mobile & Acoustic",
              description: "No stage, cables, generators, or PA systems required. We play while marching, dancing, and mingling directly with crowds.",
            },
            {
              icon: "Music",
              title: "Massive Brass & Drumline Sound",
              description: "Sousaphones, trombones, trumpets, saxophones, and marching drums delivering high-decibel acoustic excitement.",
            },
            {
              icon: "Calendar",
              title: "Parades, Festivals & Celebrations",
              description: "Civic parades, street festivals, beer gardens, wedding send-offs, and community block parties across Western PA.",
            },
          ],
        },
      },
      {
        id: "sec_gig_feed",
        type: "gig_feed_preview",
        order: 4,
        gigFeedPreview: {
          title: "Upcoming Performances",
          subtitle: "Catch the Eagleburger Band live on the streets and stages of Pittsburgh",
          maxItems: 3,
          showVenueAddress: true,
          showTicketLinks: true,
          ctaText: "View Full Performance Schedule",
          ctaHref: "/gigs",
        },
      },
    ],
  }),

  gigs: ContentPageSchema.parse({
    id: "gigs",
    slug: "gigs",
    title: "Performances",
    description: "Parades, street rallies, outdoor festivals, and community celebrations across the Greater Pittsburgh area. All acoustic, high-decibel, and open to the public.",
    isPublished: true,
    headerImage: {
      imageUrl: "",
      altText: "",
      overlayOpacity: 60,
      headlineAlignment: "center",
      heightPreset: "standard",
      badgeText: "Live Performance Schedule",
      customTitle: "Where to Catch the Band",
      customSubtitle: "Parades, street rallies, outdoor festivals, and community celebrations across Greater Pittsburgh.",
      verticalPosition: 50,
    },
    seo: {
      metaTitle: "Live Performances & Shows | Eagleburger Band Pittsburgh",
      metaDescription: "Find upcoming parade appearances, street festivals, and civic performances with the Eagleburger Band across Western Pennsylvania.",
      keywords: "eagleburger shows, brass band schedule, pittsburgh parade band, live outdoor music",
      structuredDataType: "Event",
    },
    sections: [],
  }),

  book: ContentPageSchema.parse({
    id: "book",
    slug: "book",
    title: "Book the Band",
    description: "Bring mobile acoustic brass and high-energy drumline grooves to your festival, parade, or celebration. Inquire directly with band management.",
    isPublished: true,
    headerImage: {
      imageUrl: "",
      altText: "",
      overlayOpacity: 65,
      headlineAlignment: "center",
      heightPreset: "standard",
      badgeText: "Direct Event Booking",
      customTitle: "Book the Eagleburger Band",
      customSubtitle: "Tell us about your event. We will check band availability, outline performance options, and follow up promptly.",
      verticalPosition: 50,
    },
    seo: {
      metaTitle: "Book the Band | Eagleburger Band Pittsburgh Event Inquiries",
      metaDescription: "Inquire about booking the Eagleburger Band for parades, festivals, block parties, weddings, and celebrations across Western Pennsylvania.",
      keywords: "hire brass band, parade entertainment booking, mobile drumline, event band pittsburgh",
      structuredDataType: "WebPage",
    },
    sections: [],
  }),

  join: ContentPageSchema.parse({
    id: "join",
    slug: "join",
    title: "Join the Band",
    description: "Do you play brass or battery percussion? We are always looking for passionate, energetic musicians to blow the roof off Pittsburgh's streets, parades, and festivals.",
    isPublished: true,
    headerImage: {
      imageUrl: "",
      altText: "",
      overlayOpacity: 60,
      headlineAlignment: "center",
      heightPreset: "standard",
      badgeText: "Musician Recruitment & Auditions",
      customTitle: "Join the Eagleburger Band",
      customSubtitle: "March, groove, and blow the roof off Pittsburgh's streets with our brass and drum battery.",
      verticalPosition: 50,
    },
    seo: {
      metaTitle: "Join the Band / Auditions | Eagleburger Band Pittsburgh",
      metaDescription: "Audition and musician recruitment for the Eagleburger Band. Looking for sousaphones, trombones, trumpets, saxophones, and battery percussionists.",
      keywords: "join brass band, marching auditions pittsburgh, drumline auditions, brass players wanted",
      structuredDataType: "WebPage",
    },
    sections: [],
  }),

  testimonials: ContentPageSchema.parse({
    id: "testimonials",
    slug: "testimonials",
    title: "Testimonials",
    description: "From thunderous street parades to festival stages and private parties, here is what event organizers and spectators have to say about the Eagleburger Band.",
    isPublished: true,
    headerImage: {
      imageUrl: "",
      altText: "",
      overlayOpacity: 60,
      headlineAlignment: "center",
      heightPreset: "standard",
      badgeText: "Audience & Client Reviews",
      customTitle: "What People Say",
      customSubtitle: "From thunderous street parades to festival stages and private parties, here is what event organizers have to say.",
      verticalPosition: 50,
    },
    seo: {
      metaTitle: "Testimonials & Reviews | Eagleburger Band Pittsburgh",
      metaDescription: "Read real client reviews and audience feedback from parade coordinators, festival directors, and party hosts who booked the Eagleburger Band.",
      keywords: "eagleburger band reviews, parade band testimonials, event entertainment reviews",
      structuredDataType: "WebPage",
    },
    sections: [],
  }),

  giving: ContentPageSchema.parse({
    id: "giving",
    slug: "giving",
    title: "Community Giving",
    description: "A portion of our performance proceeds is donated to grassroots organizations making Pittsburgh a healthier, more vibrant, and more musical place for everyone.",
    isPublished: true,
    headerImage: {
      imageUrl: "",
      altText: "",
      overlayOpacity: 60,
      headlineAlignment: "center",
      heightPreset: "standard",
      badgeText: "Philanthropy & Regional Support",
      customTitle: "Music on the Streets, Support in the Community",
      customSubtitle: "A portion of our performance proceeds is donated to grassroots organizations across Western Pennsylvania.",
      verticalPosition: 50,
    },
    seo: {
      metaTitle: "Community Giving & Philanthropy | Eagleburger Band",
      metaDescription: "Learn about the Eagleburger Band's charitable contributions and community giving initiatives supporting regional causes in Pittsburgh.",
      keywords: "community giving, charity band, music philanthropy, grassroots pittsburgh support",
      structuredDataType: "WebPage",
    },
    sections: [],
  }),

  contact: ContentPageSchema.parse({
    id: "contact",
    slug: "contact",
    title: "Contact Us",
    description: "Have a question about our community appearances, press inquiries, merchandise, or general feedback? Send us a message and our team will get back to you.",
    isPublished: true,
    headerImage: {
      imageUrl: "",
      altText: "",
      overlayOpacity: 60,
      headlineAlignment: "center",
      heightPreset: "standard",
      badgeText: "Get in Touch",
      customTitle: "Contact the Eagleburger Band",
      customSubtitle: "Have questions about appearances, press inquiries, merchandise, or general feedback? Reach out directly.",
      verticalPosition: 50,
    },
    seo: {
      metaTitle: "Contact the Band | Eagleburger Band Pittsburgh",
      metaDescription: "Contact the Eagleburger Band management for press inquiries, general questions, media requests, or community collaborations.",
      keywords: "contact eagleburger band, pittsburgh brass band contact, band management email",
      structuredDataType: "WebPage",
    },
    sections: [],
  }),
};

export const DEFAULT_SYSTEM_PAGES_LIST: ContentPage[] = Object.values(DEFAULT_SYSTEM_PAGES);

