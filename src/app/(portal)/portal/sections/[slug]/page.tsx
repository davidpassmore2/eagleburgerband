import React from "react";
import PortalSectionView from "@/components/portal/PortalSectionView";

export function generateStaticParams() {
  return [
    { slug: "help-docs" },
    { slug: "performances-logistics" },
    { slug: "personnel-attendance" },
    { slug: "music-repertoire" },
    { slug: "website-intake" },
    { slug: "finance" },
    { slug: "business-admin" },
  ];
}

export default async function PortalSectionHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PortalSectionView slug={slug} />;
}
