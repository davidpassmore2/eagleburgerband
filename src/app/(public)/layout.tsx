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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Alfa+Slab+One&family=Anton&family=Archivo+Black&family=Arvo:wght@400;700&family=Bebas+Neue&family=Bitter:wght@400;500;600&family=Bree+Serif&family=Cinzel:wght@600;700;900&family=Crete+Round&family=DM+Sans:wght@400;500;700&family=EB+Garamond:wght@400;500;600&family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Merriweather:wght@400;700&family=Montserrat:wght@600;700;900&family=Open+Sans:wght@400;600&family=Oswald:wght@600;700&family=Outfit:wght@400;500;600&family=Playfair+Display:wght@600;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=PT+Serif:wght@400;700&family=Raleway:wght@400;500;600&family=Righteous&family=Roboto:wght@400;500;700&family=Rokkitt:wght@600;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Space+Grotesk:wght@400;500;700&family=Syne:wght@600;700;800&family=Teko:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap"
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
