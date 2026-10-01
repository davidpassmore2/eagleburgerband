import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Testimonials & Reviews | Eagleburger Band",
  description: "Read reviews from festival directors, event coordinators, and parade hosts who brought the Eagleburger Band to their celebrations.",
  openGraph: {
    title: "Testimonials & Reviews | Eagleburger Band",
    description: "Read reviews from festival directors, event coordinators, and parade hosts who brought the Eagleburger Band to their celebrations.",
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
