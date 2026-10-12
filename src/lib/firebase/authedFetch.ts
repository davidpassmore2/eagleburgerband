import { auth } from "@/lib/firebase/client";

export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const idToken = await auth.currentUser?.getIdToken();
  if (idToken) headers.set("Authorization", `Bearer ${idToken}`);
  return fetch(input, { ...init, headers });
}
