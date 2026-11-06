import type { Metadata } from "next";
import { getPublicPageMetadata } from "@/lib/public/publicMetadata";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return getPublicPageMetadata(slug);
}

export default function DynamicPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

