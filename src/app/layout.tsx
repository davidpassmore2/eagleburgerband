import type { Metadata } from "next";
import "./globals.css";
import { bandConfig } from "@/band.config";

export const metadata: Metadata = {
  title: bandConfig.name,
  description: bandConfig.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-slate-950 text-slate-100 antialiased"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
