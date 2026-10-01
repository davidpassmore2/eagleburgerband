import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support the Band & Charitable Giving | Eagleburger Band",
  description: "Support Pittsburgh's non-profit mobile street band. Your contributions fund sheet music arrangements, percussion repairs, uniforms, and youth music outreach.",
  openGraph: {
    title: "Support the Band & Charitable Giving | Eagleburger Band",
    description: "Support Pittsburgh's non-profit mobile street band. Your contributions fund sheet music arrangements, percussion repairs, uniforms, and youth music outreach.",
  },
};

export default function GivingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
