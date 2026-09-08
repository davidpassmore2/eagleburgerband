import { User } from "@/lib/schema/user";

export type Role =
  | "admin"
  | "web_manager"
  | "gig_manager"
  | "catalog_manager"
  | "community_manager"
  | "treasurer"
  | "section_leader"
  | "member";

export function hasRole(user: User | null, role: Role): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes("admin") || user.roles.includes(role);
}

export function hasAnyRole(user: User | null, roles: Role[]): boolean {
  if (!user || !user.roles) return false;
  if (user.roles.includes("admin")) return true;
  return roles.some((r) => user.roles.includes(r));
}

export function isAdmin(user: User | null): boolean {
  return hasRole(user, "admin");
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

export function isSectionLeader(user: User | null, sectionId?: string): boolean {
  if (!user) return false;
  if (user.roles.includes("admin")) return true;
  if (!user.roles.includes("section_leader")) return false;
  if (!sectionId) return true;
  return user.sectionId === sectionId;
}