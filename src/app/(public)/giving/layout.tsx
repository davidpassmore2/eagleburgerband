import type { Metadata } from "next";
import { getPublicPageMetadata } from "@/lib/public/publicMetadata";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata("giving");
}

export default function GivingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
