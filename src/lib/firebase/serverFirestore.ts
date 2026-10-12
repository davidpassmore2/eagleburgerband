import { firebaseProjectId, isFirebaseEmulator } from "@/lib/firebase/emulator";
import { getServiceAccessToken } from "@/lib/firebase/admin";

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { referenceValue: string }
  | { bytesValue: string }
  | { geoPointValue: { latitude: number; longitude: number } };

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

export interface ServerDoc {
  id: string;
  path: string;
  data: Record<string, unknown>;
}

function documentsRoot(): string {
  const host = isFirebaseEmulator()
    ? `http://${process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080"}`
    : "https://firestore.googleapis.com";
  return `${host}/v1/projects/${firebaseProjectId}/databases/(default)/documents`;
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
}

function encodeFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) fields[key] = encodeValue(value);
  }
  return fields;
}

function decodeValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  if ("referenceValue" in value) return value.referenceValue;
  if ("bytesValue" in value) return value.bytesValue;
  return value.geoPointValue;
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    data[key] = decodeValue(value);
  }
  return data;
}

function toServerDoc(doc: FirestoreDocument): ServerDoc {
  const path = doc.name.split("/documents/")[1];
  return { id: path.split("/").pop() as string, path, data: decodeFields(doc.fields || {}) };
}

function fieldPath(key: string): string {
  return /^[A-Za-z_][A-Za-z_0-9]*$/.test(key) ? key : `\`${key.replace(/`/g, "\\`")}\``;
}

async function call(method: string, url: string, body?: unknown): Promise<Response> {
  const token = await getServiceAccessToken();
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function fail(action: string, path: string, res: Response): Promise<never> {
  throw new Error(`Firestore ${action} ${path} failed (${res.status}): ${await res.text()}`);
}

export async function getDocument(path: string): Promise<ServerDoc | null> {
  const res = await call("GET", `${documentsRoot()}/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) return fail("get", path, res);
  return toServerDoc((await res.json()) as FirestoreDocument);
}

async function runQuery(collectionPath: string, where?: { field: string; value: unknown }, allDescendants = false): Promise<ServerDoc[]> {
  const segments = collectionPath.split("/");
  const collectionId = segments.pop() as string;
  const parent = segments.length ? `/${segments.join("/")}` : "";
  const structuredQuery: Record<string, unknown> = { from: [{ collectionId, allDescendants }] };
  if (where) {
    structuredQuery.where = {
      fieldFilter: { field: { fieldPath: fieldPath(where.field) }, op: "EQUAL", value: encodeValue(where.value) },
    };
  }
  const res = await call("POST", `${documentsRoot()}${parent}:runQuery`, { structuredQuery });
  if (!res.ok) return fail("query", collectionPath, res);
  const rows = (await res.json()) as { document?: FirestoreDocument }[];
  return rows.filter((row) => row.document).map((row) => toServerDoc(row.document as FirestoreDocument));
}

export function listDocuments(collectionPath: string): Promise<ServerDoc[]> {
  return runQuery(collectionPath);
}

export function findDocuments(collectionPath: string, field: string, value: unknown): Promise<ServerDoc[]> {
  return runQuery(collectionPath, { field, value });
}

export function listCollectionGroup(collectionId: string): Promise<ServerDoc[]> {
  return runQuery(collectionId, undefined, true);
}

export async function setDocument(path: string, data: Record<string, unknown>): Promise<void> {
  const res = await call("PATCH", `${documentsRoot()}/${path}`, { fields: encodeFields(data) });
  if (!res.ok) await fail("set", path, res);
}

export async function updateDocument(path: string, data: Record<string, unknown>): Promise<void> {
  const params = new URLSearchParams({ "currentDocument.exists": "true" });
  for (const key of Object.keys(data)) params.append("updateMask.fieldPaths", fieldPath(key));
  const res = await call("PATCH", `${documentsRoot()}/${path}?${params}`, { fields: encodeFields(data) });
  if (!res.ok) await fail("update", path, res);
}

export async function addDocument(collectionPath: string, data: Record<string, unknown>): Promise<string> {
  const res = await call("POST", `${documentsRoot()}/${collectionPath}`, { fields: encodeFields(data) });
  if (!res.ok) return fail("add", collectionPath, res);
  return toServerDoc((await res.json()) as FirestoreDocument).id;
}

export async function deleteDocument(path: string): Promise<void> {
  const res = await call("DELETE", `${documentsRoot()}/${path}`);
  if (!res.ok && res.status !== 404) await fail("delete", path, res);
}
