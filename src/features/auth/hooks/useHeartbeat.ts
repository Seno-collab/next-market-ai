"use client";

import { useEffect, useRef } from "react";
import { getStoredAuthTokens, signOut } from "@/lib/api/client";

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

async function sendHeartbeat() {
  try {
    const tokens = getStoredAuthTokens();
    const headers: Record<string, string> = {};
    if (tokens?.accessToken) {
      headers.authorization = `Bearer ${tokens.accessToken}`;
    }
    const res = await fetch("/api/auth/heartbeat", {
      method: "POST",
      headers,
      credentials: "include",
    });
    if (res.status === 401) {
      await signOut();
    }
  } catch {
    // Silently ignore network errors — heartbeat is best-effort
  }
}

/**
 * Sends a POST /api/auth/heartbeat every 2 minutes while the user is authenticated.
 * Stops automatically when the component unmounts or the user logs out.
 */
export function useHeartbeat(authenticated: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Send immediately on mount / login
    void sendHeartbeat();

    intervalRef.current = setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [authenticated]);
}
