import React from "react";
import { AuthProvider } from "@/lib/context/AuthContext";
import PublicHeaderNav from "@/components/public/PublicHeaderNav";
import PublicFooter from "@/components/public/PublicFooter";
import PublicAnnouncementBanner from "@/components/public/PublicAnnouncementBanner";
import { PublicLoadingProvider } from "@/lib/context/PublicLoadingContext";

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
      <PublicLoadingProvider>
        <div 
          className="public-site min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-yellow-400 selection:text-slate-950"
          suppressHydrationWarning
        >
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
        </div>
      </PublicLoadingProvider>
    </AuthProvider>
  );
}
