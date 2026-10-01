import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Inquiries | Eagleburger Band Pittsburgh",
  description: "Get in touch with the Eagleburger Band leadership for booking questions, press inquiries, community collaborations, and festival planning.",
  openGraph: {
    title: "Contact & Inquiries | Eagleburger Band",
    description: "Get in touch with the Eagleburger Band leadership for booking questions, press inquiries, community collaborations, and festival planning.",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
