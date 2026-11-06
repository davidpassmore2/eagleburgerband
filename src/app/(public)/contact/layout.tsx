import type { Metadata } from "next";
import { getPublicPageMetadata } from "@/lib/public/publicMetadata";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata("contact");
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
