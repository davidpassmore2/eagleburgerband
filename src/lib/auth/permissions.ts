import { RoleEnum, User } from "@/lib/schema/user";
import { z } from "zod";

export type Role = z.infer<typeof RoleEnum>;

export function hasRole(user: User | null | undefined, role: Role): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes("admin") || user.roles.includes(role);
}

export function canManageSections(user: User | null | undefined): boolean {
  return hasRole(user, "admin");
}

export function canManageRoster(user: User | null | undefined): boolean {
  return hasRole(user, "admin");
}

export function canManageTheme(user: User | null | undefined): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes("admin") || user.roles.includes("web_manager");
}

export function canManageGigs(user: User | null | undefined): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes("admin") || user.roles.includes("gig_manager");
}

export function canManageCatalog(user: User | null | undefined): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes("admin") || user.roles.includes("catalog_manager");
}

export function canModerateCommunity(user: User | null | undefined): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes("admin") || user.roles.includes("community_manager");
}

export function isSectionLeader(user: User | null | undefined, sectionId?: string): boolean {
  if (!user || !user.roles) return false;
  if (user.roles.includes("admin")) return true;
  if (!user.roles.includes("section_leader")) return false;
  if (!sectionId) return true;
  return user.sectionId === sectionId;
}