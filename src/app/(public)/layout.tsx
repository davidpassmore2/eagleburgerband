import React from "react";
import { AuthProvider } from "@/lib/context/AuthContext";
import PublicHeaderNav from "@/components/public/PublicHeaderNav";
import PublicFooter from "@/components/public/PublicFooter";
import PublicAnnouncementBanner from "@/components/public/PublicAnnouncementBanner";
import { PublicLoadingProvider } from "@/lib/context/PublicLoadingContext";
import PublicThemeShell from "@/components/public/PublicThemeShell";

export const metadata = {
  title: "Eagleburger Band | Pittsburgh Street Brass & Drums",
  description: "Pittsburgh's premier mobile acoustic street brass and drumline powerhouse. Available for parades, festivals, block parties, and celebrations.",
  openGraph: {
    title: "Eagleburger Band | Pittsburgh Street Brass & Drums",
    description: "Pittsburgh's premier mobile acoustic street brass and drumline powerhouse. Available for parades, festivals, block parties, and celebrations.",
    type: "website",
    locale: "en_US",
    siteName: "Eagleburger Band",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eagleburger Band | Pittsburgh Street Brass & Drums",
    description: "Pittsburgh's premier mobile acoustic street brass and drumline powerhouse.",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <PublicThemeShell>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Arvo:wght@400;700&family=Bebas+Neue&family=Cinzel:wght@600;700;900&family=Lora:ital,wght@0,400;0,600;1,400&family=Merriweather:wght@400;700&family=Montserrat:wght@600;700;900&family=Oswald:wght@600;700&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Rokkitt:wght@600;800&family=Space+Grotesk:wght@400;500;700&display=swap"
        />
        <PublicLoadingProvider>
          {/* Dynamic Site Announcement Banner */}
          <PublicAnnouncementBanner />

          {/* Dynamic Configurable Header Navigation */}
          <PublicHeaderNav />

          {/* Main Marketing Content Canvas */}
          <main className="flex-1" suppressHydrationWarning>
            {children}
          </main>

          {/* Dynamic Public Marketing Footer */}
          <PublicFooter />
        </PublicLoadingProvider>
      </PublicThemeShell>
    </AuthProvider>
  );
}
