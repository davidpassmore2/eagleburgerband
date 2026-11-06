import type { Metadata } from "next";
import { getPublicPageMetadata } from "@/lib/public/publicMetadata";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata("join");
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
