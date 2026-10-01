import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the Band & Auditions | Eagleburger Band",
  description: "March and play with Pittsburgh's powerhouse street brass ensemble. Open to trumpets, trombones, saxophones, sousaphones, and marching percussion.",
  openGraph: {
    title: "Join the Band & Auditions | Eagleburger Band",
    description: "March and play with Pittsburgh's powerhouse street brass ensemble. Open to trumpets, trombones, saxophones, sousaphones, and marching percussion.",
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
