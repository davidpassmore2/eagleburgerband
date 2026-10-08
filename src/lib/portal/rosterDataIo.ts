import { User, RoleEnum } from "@/lib/schema/user";
import { Section } from "@/lib/schema/section";
import { z } from "zod";

export type Role = z.infer<typeof RoleEnum>;

export interface ParsedRosterMember {
  uid?: string;
  email: string;
  displayName: string;
  sectionId: string | null;
  sectionName?: string;
  instruments: string[];
  roles: Role[];
  phone: string;
  status: "active" | "inactive" | "pending";
  payoutMethod?: "venmo" | "paypal" | "zelle" | "check" | "other";
  venmoHandle?: string;
  paypalEmail?: string;
  zelleIdentifier?: string;
  notes?: string;
  rawRowIndex?: number;
  errors?: string[];
}

export interface RosterExportPackage {
  schemaVersion: number;
  exportedAt: string;
  source: string;
  count: number;
  members: Array<{
    uid: string;
    displayName: string;
    email: string;
    sectionId: string | null;
    sectionName: string;
    instruments: string[];
    roles: Role[];
    phone: string;
    status: string;
    payoutPreferences?: {
      preferredMethod?: string;
      venmoHandle?: string;
      paypalEmail?: string;
      zelleIdentifier?: string;
      notes?: string;
    };
    createdAt?: string;
    updatedAt?: string;
  }>;
}

const VALID_ROLES = new Set<string>([
  "admin",
  "web_manager",
  "gig_manager",
  "catalog_manager",
  "setlist_manager",
  "community_manager",
  "treasurer",
  "section_leader",
  "membership_manager",
  "asset_manager",
  "member",
  "guest",
]);

/**
 * Escapes a single cell value for CSV output.
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports roster members to CSV format.
 */
export function exportRosterToCsv(users: User[], sections: Section[]): string {
  const sectionMap = new Map<string, string>();
  sections.forEach((s) => {
    sectionMap.set(s.id, s.name);
  });

  const headers = [
    "Name",
    "Email",
    "Section",
    "Section ID",
    "Instruments",
    "Roles",
    "Phone",
    "Status",
    "UID",
    "Payout Method",
    "Venmo Handle",
    "PayPal Email",
    "Zelle ID",
    "Notes",
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(",")];

  users.forEach((u) => {
    const secName = u.sectionId ? sectionMap.get(u.sectionId) || u.sectionId : "";
    const instrumentsStr = (u.instruments || []).join(", ");
    const rolesStr = (u.roles || []).join(", ");
    const payout = u.payoutPreferences || {};

    const row = [
      u.displayName || "",
      u.email || "",
      secName,
      u.sectionId || "",
      instrumentsStr,
      rolesStr,
      u.phone || "",
      u.status || "active",
      u.uid || "",
      payout.preferredMethod || "",
      payout.venmoHandle || "",
      payout.paypalEmail || "",
      payout.zelleIdentifier || "",
      payout.notes || "",
    ];

    rows.push(row.map(escapeCsvCell).join(","));
  });

  return rows.join("\r\n");
}

/**
 * Exports roster members to JSON format with metadata.
 */
export function exportRosterToJson(users: User[], sections: Section[]): string {
  const sectionMap = new Map<string, string>();
  sections.forEach((s) => {
    sectionMap.set(s.id, s.name);
  });

  const pkg: RosterExportPackage = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: "Eagleburger Band Beta Musician Roster",
    count: users.length,
    members: users.map((u) => ({
      uid: u.uid,
      displayName: u.displayName,
      email: u.email,
      sectionId: u.sectionId,
      sectionName: u.sectionId ? sectionMap.get(u.sectionId) || u.sectionId : "Unassigned",
      instruments: u.instruments || [],
      roles: u.roles || ["member"],
      phone: u.phone || "",
      status: u.status || "active",
      payoutPreferences: u.payoutPreferences,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
  };

  return JSON.stringify(pkg, null, 2);
}

/**
 * Robust CSV parser that correctly handles quoted strings, escaped quotes, and newlines.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentField += '"';
          i++;
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || inQuotes) {
    currentRow.push(currentField.trim());
  }
  if (currentRow.some((f) => f.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Matches a header string to a canonical field key.
 */
function normalizeHeaderKey(header: string): string {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean.includes("name") && !clean.includes("section") && !clean.includes("venmo")) return "displayName";
  if (clean.includes("email") && !clean.includes("paypal")) return "email";
  if (clean === "sectionid" || clean === "secid") return "sectionId";
  if (clean.includes("section") || clean.includes("part")) return "sectionName";
  if (clean.includes("instrument")) return "instruments";
  if (clean.includes("role") || clean.includes("perm")) return "roles";
  if (clean.includes("phone") || clean.includes("cell") || clean.includes("mobile")) return "phone";
  if (clean.includes("status")) return "status";
  if (clean === "uid" || clean === "id") return "uid";
  if (clean.includes("payout") || clean.includes("method")) return "payoutMethod";
  if (clean.includes("venmo")) return "venmoHandle";
  if (clean.includes("paypal")) return "paypalEmail";
  if (clean.includes("zelle")) return "zelleIdentifier";
  if (clean.includes("note")) return "notes";
  return clean;
}

/**
 * Resolves section name or ID to an existing section ID.
 */
function resolveSectionId(
  inputSecId: string | undefined,
  inputSecName: string | undefined,
  sections: Section[]
): { sectionId: string | null; sectionName: string } {
  const candidateId = (inputSecId || "").trim().toLowerCase();
  const candidateName = (inputSecName || "").trim().toLowerCase();

  // 1. Direct ID match
  if (candidateId) {
    const directMatch = sections.find((s) => s.id.toLowerCase() === candidateId);
    if (directMatch) return { sectionId: directMatch.id, sectionName: directMatch.name };
  }

  // 2. Name match
  if (candidateName) {
    const nameMatch = sections.find(
      (s) => s.name.toLowerCase() === candidateName || s.id.toLowerCase() === candidateName
    );
    if (nameMatch) return { sectionId: nameMatch.id, sectionName: nameMatch.name };

    // Partial substring match
    const partialMatch = sections.find(
      (s) =>
        s.name.toLowerCase().includes(candidateName) ||
        candidateName.includes(s.name.toLowerCase()) ||
        s.id.toLowerCase().includes(candidateName)
    );
    if (partialMatch) return { sectionId: partialMatch.id, sectionName: partialMatch.name };
  }

  // 3. If ID was provided and sections list is empty, preserve ID
  if (inputSecId && inputSecId.trim()) {
    return { sectionId: inputSecId.trim(), sectionName: inputSecName || inputSecId.trim() };
  }

  return { sectionId: null, sectionName: "Unassigned" };
}

/**
 * Normalizes roles array.
 */
function normalizeRoles(raw: unknown): Role[] {
  if (Array.isArray(raw)) {
    const valid = raw
      .map((r) => String(r).trim().toLowerCase().replace(/\s+/g, "_"))
      .filter((r) => VALID_ROLES.has(r)) as Role[];
    return valid.length > 0 ? valid : ["member"];
  }

  if (typeof raw === "string" && raw.trim()) {
    const split = raw
      .split(/[,;|]/)
      .map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"))
      .filter((r) => VALID_ROLES.has(r)) as Role[];
    return split.length > 0 ? split : ["member"];
  }

  return ["member"];
}

/**
 * Normalizes instruments array.
 */
function normalizeInstruments(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((i) => String(i).trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(/[,;|/]/)
      .map((i) => i.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Parses roster members from CSV text.
 */
export function parseRosterFromCsv(csvText: string, sections: Section[]): ParsedRosterMember[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headerRow = rows[0];
  const colMap = new Map<number, string>();
  headerRow.forEach((col, idx) => {
    colMap.set(idx, normalizeHeaderKey(col));
  });

  const parsedMembers: ParsedRosterMember[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const data: Record<string, string> = {};

    row.forEach((val, idx) => {
      const key = colMap.get(idx);
      if (key) {
        data[key] = val;
      }
    });

    const email = (data.email || "").trim().toLowerCase();
    const displayName = (data.displayName || data.name || "").trim();

    if (!email && !displayName) continue;

    const errors: string[] = [];
    if (!email) {
      errors.push("Missing email address.");
    } else if (!email.includes("@")) {
      errors.push("Invalid email address format.");
    }

    if (!displayName) {
      errors.push("Missing musician name.");
    }

    const { sectionId, sectionName } = resolveSectionId(data.sectionId, data.sectionName, sections);
    const instruments = normalizeInstruments(data.instruments);
    const roles = normalizeRoles(data.roles);

    let status: "active" | "inactive" | "pending" = "active";
    const rawStatus = (data.status || "").toLowerCase().trim();
    if (rawStatus === "inactive" || rawStatus === "pending") {
      status = rawStatus;
    }

    let payoutMethod: "venmo" | "paypal" | "zelle" | "check" | "other" | undefined = undefined;
    const rawPayout = (data.payoutMethod || "").toLowerCase().trim();
    if (["venmo", "paypal", "zelle", "check", "other"].includes(rawPayout)) {
      payoutMethod = rawPayout as "venmo" | "paypal" | "zelle" | "check" | "other";
    }

    parsedMembers.push({
      uid: data.uid ? data.uid.trim() : undefined,
      email,
      displayName: displayName || (email ? email.split("@")[0] : "Musician"),
      sectionId,
      sectionName,
      instruments,
      roles,
      phone: (data.phone || "").trim(),
      status,
      payoutMethod,
      venmoHandle: (data.venmoHandle || "").trim(),
      paypalEmail: (data.paypalEmail || "").trim(),
      zelleIdentifier: (data.zelleIdentifier || "").trim(),
      notes: (data.notes || "").trim(),
      rawRowIndex: r + 1,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  return parsedMembers;
}

/**
 * Parses roster members from JSON string.
 */
export function parseRosterFromJson(jsonText: string, sections: Section[]): ParsedRosterMember[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON file format. Please check the file syntax.");
  }

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.members)) {
      rawList = obj.members;
    } else if (Array.isArray(obj.users)) {
      rawList = obj.users;
    } else if (Array.isArray(obj.data)) {
      rawList = obj.data;
    }
  }

  if (!rawList || rawList.length === 0) {
    throw new Error("No member records found in the JSON document.");
  }

  const parsedMembers: ParsedRosterMember[] = [];

  rawList.forEach((item, idx) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;

    const email = String(row.email || "").trim().toLowerCase();
    const displayName = String(row.displayName || row.name || "").trim();

    if (!email && !displayName) return;

    const errors: string[] = [];
    if (!email) {
      errors.push("Missing email address.");
    } else if (!email.includes("@")) {
      errors.push("Invalid email address format.");
    }

    if (!displayName) {
      errors.push("Missing musician name.");
    }

    const inputSecId = typeof row.sectionId === "string" ? row.sectionId : undefined;
    const inputSecName = typeof row.sectionName === "string" ? row.sectionName : undefined;
    const { sectionId, sectionName } = resolveSectionId(inputSecId, inputSecName, sections);

    const instruments = normalizeInstruments(row.instruments);
    const roles = normalizeRoles(row.roles);

    let status: "active" | "inactive" | "pending" = "active";
    const rawStatus = String(row.status || "").toLowerCase().trim();
    if (rawStatus === "inactive" || rawStatus === "pending") {
      status = rawStatus as "inactive" | "pending";
    }

    const payout = (row.payoutPreferences && typeof row.payoutPreferences === "object"
      ? (row.payoutPreferences as Record<string, unknown>)
      : {}) as Record<string, unknown>;

    parsedMembers.push({
      uid: typeof row.uid === "string" ? row.uid.trim() : undefined,
      email,
      displayName: displayName || (email ? email.split("@")[0] : "Musician"),
      sectionId,
      sectionName,
      instruments,
      roles,
      phone: String(row.phone || "").trim(),
      status,
      payoutMethod: (payout.preferredMethod as "venmo" | "paypal" | "zelle" | "check" | "other") || undefined,
      venmoHandle: String(payout.venmoHandle || row.venmoHandle || "").trim(),
      paypalEmail: String(payout.paypalEmail || row.paypalEmail || "").trim(),
      zelleIdentifier: String(payout.zelleIdentifier || row.zelleIdentifier || "").trim(),
      notes: String(payout.notes || row.notes || "").trim(),
      rawRowIndex: idx + 1,
      errors: errors.length > 0 ? errors : undefined,
    });
  });

  return parsedMembers;
}

/**
 * Triggers a client-side file download.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

