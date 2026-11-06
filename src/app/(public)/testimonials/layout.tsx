import type { Metadata } from "next";
import { getPublicPageMetadata } from "@/lib/public/publicMetadata";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata("testimonials");
}

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
