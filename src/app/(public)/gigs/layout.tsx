import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upcoming Shows & Performances | Eagleburger Band",
  description: "Catch the Eagleburger Band live! Explore upcoming parades, festivals, block parties, and street brass performances in Pittsburgh and Western Pennsylvania.",
  openGraph: {
    title: "Upcoming Shows & Performances | Eagleburger Band",
    description: "Catch the Eagleburger Band live! Explore upcoming parades, festivals, block parties, and street brass performances in Pittsburgh and Western Pennsylvania.",
  },
};

export default function GigsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
