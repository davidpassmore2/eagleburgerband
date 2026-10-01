import { PortalLoadingOverlay } from "@/components/portal/PortalLoadingOverlay";

export default function PublicLoading() {
  return <PortalLoadingOverlay show={true} label="Loading Eagleburger Band..." fallbackBadge="BAND" />;
}

