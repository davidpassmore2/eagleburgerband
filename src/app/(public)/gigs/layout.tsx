import type { Metadata } from "next";
import { getPublicPageMetadata } from "@/lib/public/publicMetadata";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata("gigs");
}

export default function GigsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
