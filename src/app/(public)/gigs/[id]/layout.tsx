import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Performance Details | Eagleburger Band",
  description: "Event details, step-off location, schedule, and venue directions for this Eagleburger Band performance.",
};

export default function GigDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
