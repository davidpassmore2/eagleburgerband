// src/lib/schema/siteConfig.ts
import { z } from "zod";

export const NavLinkSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Link label required"),
  href: z.string().min(1, "Link destination required"),
  isVisible: z.boolean().default(true),
  order: z.number().default(0),
  icon: z.string().default(""), // e.g. "Calendar", "Send", "HeartHandshake", "Music2", "Shield"
  isButton: z.boolean().default(false),
  isExternal: z.boolean().default(false),
  openInNewTab: z.boolean().default(false),
});

export const AnnouncementBannerSchema = z.object({
  enabled: z.boolean().default(false),
  message: z.string().default(""),
  linkText: z.string().default(""),
  linkHref: z.string().default(""),
  bannerType: z.enum(["highlight", "info", "alert"]).default("highlight"),
});

export const SocialPlatformEnum = z.enum([
  "youtube",
  "instagram",
  "facebook",
  "tiktok",
  "spotify",
  "twitter",
  "custom",
]);

export const SocialLinkSchema = z.object({
  id: z.string(),
  platform: SocialPlatformEnum.default("custom"),
  label: z.string().min(1, "Social platform label required"),
  href: z.string().min(1, "Social link URL required"),
  isVisible: z.boolean().default(true),
  order: z.number().default(0),
});

export const DEFAULT_HEADER_LINKS = [
  { id: "nav_home", label: "Home", href: "/", isVisible: true, order: 1, icon: "" },
  { id: "nav_gigs", label: "Performances", href: "/gigs", isVisible: true, order: 2, icon: "Calendar" },
  { id: "nav_book", label: "Book the Band", href: "/book", isVisible: true, order: 3, icon: "Send" },
  { id: "nav_giving", label: "Community Giving", href: "/giving", isVisible: true, order: 4, icon: "HeartHandshake" },
];

export const DEFAULT_FOOTER_LINKS = [
  { id: "fn_home", label: "Home", href: "/", isVisible: true, order: 1, icon: "" },
  { id: "fn_gigs", label: "Upcoming Shows", href: "/gigs", isVisible: true, order: 2, icon: "" },
  { id: "fn_book", label: "Book the Band", href: "/book", isVisible: true, order: 3, icon: "" },
  { id: "fn_giving", label: "Support the Band", href: "/giving", isVisible: true, order: 4, icon: "" },
  { id: "fn_portal", label: "Musician Portal", href: "/portal", isVisible: true, order: 5, icon: "" },
];

export const DEFAULT_SOCIAL_LINKS = [
  { id: "soc_youtube", platform: "youtube" as const, label: "YouTube", href: "https://www.youtube.com/@EagleburgerBand", isVisible: true, order: 1 },
  { id: "soc_instagram", platform: "instagram" as const, label: "Instagram", href: "https://www.instagram.com/eagleburgerband", isVisible: true, order: 2 },
  { id: "soc_facebook", platform: "facebook" as const, label: "Facebook", href: "https://www.facebook.com/col.eagleburger", isVisible: true, order: 3 },
  { id: "soc_spotify", platform: "spotify" as const, label: "Spotify", href: "https://open.spotify.com", isVisible: false, order: 4 },
  { id: "soc_tiktok", platform: "tiktok" as const, label: "TikTok", href: "https://www.tiktok.com/@eagleburgerband", isVisible: false, order: 5 },
];

export const SiteNavigationSchema = z.object({
  id: z.string().default("main_nav"),
  headerLinks: z.array(NavLinkSchema).default(() => DEFAULT_HEADER_LINKS.map((l) => NavLinkSchema.parse(l))),
  footerLinks: z.array(NavLinkSchema).default(() => DEFAULT_FOOTER_LINKS.map((l) => NavLinkSchema.parse(l))),
  socialLinks: z.array(SocialLinkSchema).default(() => DEFAULT_SOCIAL_LINKS.map((s) => SocialLinkSchema.parse(s))),
  announcementBanner: AnnouncementBannerSchema.default(() => AnnouncementBannerSchema.parse({})),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type NavLink = z.infer<typeof NavLinkSchema>;
export type SocialPlatform = z.infer<typeof SocialPlatformEnum>;
export type SocialLink = z.infer<typeof SocialLinkSchema>;
export type AnnouncementBanner = z.infer<typeof AnnouncementBannerSchema>;
export type SiteNavigation = z.infer<typeof SiteNavigationSchema>;

