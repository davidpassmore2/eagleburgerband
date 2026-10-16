"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  AuthProvidersConfig,
  AuthProvidersConfigSchema,
  DEFAULT_AUTH_PROVIDERS_CONFIG,
} from "@/lib/schema/authProvidersConfig";

export function useAuthProvidersConfig() {
  const [config, setConfig] = useState<AuthProvidersConfig>(DEFAULT_AUTH_PROVIDERS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const configDocRef = doc(db, "system_config", "auth_providers");

    const unsubscribe = onSnapshot(
      configDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const parsed = AuthProvidersConfigSchema.safeParse(snapshot.data());
          if (parsed.success) {
            setConfig(parsed.data);
          } else {
            console.warn("[AuthProvidersConfig] Schema parse failed, using defaults:", parsed.error);
            setConfig(DEFAULT_AUTH_PROVIDERS_CONFIG);
          }
        } else {
          setConfig(DEFAULT_AUTH_PROVIDERS_CONFIG);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("[AuthProvidersConfig] Listener note (falling back to defaults):", err.message);
        setConfig(DEFAULT_AUTH_PROVIDERS_CONFIG);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const saveConfig = useCallback(
    async (
      updatedFields: Partial<AuthProvidersConfig>,
      actor?: { uid?: string; displayName?: string; email?: string }
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const newPayload: AuthProvidersConfig = {
          ...config,
          ...updatedFields,
          updatedAt: new Date().toISOString(),
          updatedBy: actor?.displayName || actor?.email || "admin",
        };

        const validated = AuthProvidersConfigSchema.parse(newPayload);
        const configDocRef = doc(db, "system_config", "auth_providers");
        await setDoc(configDocRef, validated, { merge: true });

        // Log admin audit entry
        try {
          await addDoc(collection(db, "admin_audit_log"), {
            action: "system_config",
            category: "system",
            actorUid: actor?.uid || "",
            actorName: actor?.displayName || "Administrator",
            actorEmail: actor?.email || "",
            targetId: "auth_providers",
            targetName: "Authentication Providers",
            description: "Updated authentication provider visibility toggles",
            metadata: {
              google: validated.google,
              apple: validated.apple,
              microsoft: validated.microsoft,
              github: validated.github,
              magicLink: validated.magicLink,
              password: validated.password,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (auditErr) {
          console.warn("[AuthProvidersConfig] Audit log write note:", auditErr);
        }

        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },
    [config]
  );

  return {
    config,
    loading,
    error,
    saveConfig,
  };
}

