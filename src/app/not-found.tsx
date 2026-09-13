import NotFoundView from "@/components/common/NotFoundView";

export const metadata = {
  title: "404 - Page Not Found | Eagleburger Band",
  description: "The requested page or route could not be found. Return to the Eagleburger Band homepage, performance schedule, or musician portal.",
};

export default function NotFound() {
  return <NotFoundView />;
}
