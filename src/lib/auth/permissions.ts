import { User } from "@/lib/schema/user";

export type Role =
  | "admin"
  | "web_manager"
  | "gig_manager"
  | "catalog_manager"
  | "community_manager"
  | "treasurer"
  | "section_leader"
  | "membership_manager"
  | "asset_manager"
  | "member"
  | "guest";

export function hasRole(user: User | null, role: Role): boolean {
  if (!user || !user.roles) return false;
  const userRoles = user.roles as readonly string[];
  return userRoles.includes("admin") || userRoles.includes(role);
}

export function hasAnyRole(user: User | null, roles: Role[]): boolean {
  if (!user || !user.roles) return false;
  const userRoles = user.roles as readonly string[];
  if (userRoles.includes("admin")) return true;
  return roles.some((r) => userRoles.includes(r));
}

export function isAdmin(user: User | null): boolean {
  return hasRole(user, "admin");
}

export function canManageSections(user: User | null): boolean {
  return hasAnyRole(user, ["admin", "section_leader", "membership_manager"]);
}

export function canManageRoster(user: User | null): boolean {
  return hasAnyRole(user, ["admin", "membership_manager"]);
}

export function canManageAssets(user: User | null): boolean {
  return hasAnyRole(user, ["admin", "asset_manager"]);
}

export function canManageTheme(user: User | null): boolean {
  return hasAnyRole(user, ["admin", "web_manager"]);
}

export function canManageGigs(user: User | null): boolean {
  return hasAnyRole(user, ["admin", "gig_manager"]);
}

export function canManageCatalog(user: User | null): boolean {
  return hasAnyRole(user, ["admin", "catalog_manager"]);
}

export function canManageContent(user: User | null): boolean {
  return hasAnyRole(user, ["admin", "web_manager", "community_manager"]);
}

export function canManageFinances(user: User | null): boolean {
  return hasAnyRole(user, ["admin", "treasurer"]);
}

export function canManageGiving(user: User | null): boolean {
  return hasAnyRole(user, ["admin", "treasurer", "community_manager"]);
}

export function isSectionLeader(user: User | null, sectionId?: string): boolean {
  if (!user || !user.roles) return false;
  const userRoles = user.roles as readonly string[];
  if (userRoles.includes("admin")) return true;
  if (!userRoles.includes("section_leader")) return false;
  if (!sectionId) return true;
  return user.sectionId === sectionId;
}

export function canViewAndSubmitTunes(user: User | null): boolean {
  return hasAnyRole(user, [
    "admin",
    "catalog_manager",
    "gig_manager",
    "section_leader",
    "membership_manager",
    "asset_manager",
    "community_manager",
    "treasurer",
    "web_manager",
    "member",
    "guest",
  ]);
}

export function canDispatchBroadcasts(user: User | null): boolean {
  return hasAnyRole(user, [
    "admin",
    "gig_manager",
    "membership_manager",
    "community_manager",
    "section_leader",
  ]);
}