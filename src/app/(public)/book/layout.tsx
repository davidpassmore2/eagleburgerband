import type { Metadata } from "next";
import { getPublicPageMetadata } from "@/lib/public/publicMetadata";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata("book");
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}

