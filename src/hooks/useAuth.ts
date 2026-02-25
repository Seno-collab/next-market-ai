"use client";

import type {
  AuthCredentials,
  AuthPublicUser,
  AuthResponse,
  AuthTokens,
  RegisterPayload,
} from "@/features/auth/types";
import { useLocale } from "@/hooks/useLocale";
import { fetchJson, setStoredAuthTokens } from "@/lib/api/client";
import { useCallback, useState } from "react";

const JSON_HEADERS = { "Content-Type": "application/json" };

type AuthAction =
  | "register"
  | "login"
  | "logout"
  | "profile"
  | "refresh"
  | "changePassword";

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

type TokenRecord = Record<string, unknown>;

function extractTokens(payload: unknown): AuthTokens | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as TokenRecord;
  const sources: TokenRecord[] = [];
  if (record.tokens && typeof record.tokens === "object") {
    sources.push(record.tokens as TokenRecord);
  }
  if (record.data && typeof record.data === "object") {
    sources.push(record.data as TokenRecord);
  }
  sources.push(record);

  for (const source of sources) {
    const accessToken = source.accessToken ?? source.access_token;
    const refreshToken = source.refreshToken ?? source.refresh_token;
    if (typeof accessToken === "string" && typeof refreshToken === "string") {
      return { accessToken, refreshToken };
    }
  }

  return null;
}

export function useAuth() {
  const { t } = useLocale();
  const [user, setUser] = useState<AuthPublicUser | null>(null);
  const [profile, setProfile] = useState<AuthPublicUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [message, setMessage] = useState<AuthAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<AuthAction | null>(null);

  const withAction = useCallback(
    async (action: AuthAction, task: () => Promise<void>) => {
      setLoadingAction(action);
      setMessage(null);
      setError(null);
      try {
        await task();
        setMessage(action);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("errors.generic");
        setError(errorMessage);
      } finally {
        setLoadingAction(null);
      }
    },
    [t],
  );

  const register = useCallback(
    async (payload: RegisterPayload) =>
      withAction("register", async () => {
        const result = await fetchJson<AuthResponse>("/api/auth/register", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(payload),
          cache: "no-store",
        });
        setUser(result.user ?? null);
        setProfile(result.user ?? null);
        const nextTokens = extractTokens(result);
        setTokens(nextTokens);
        setStoredAuthTokens(nextTokens);
      }),
    [withAction],
  );

  const login = useCallback(
    async (payload: AuthCredentials) =>
      withAction("login", async () => {
        const result = await fetchJson<AuthResponse>("/api/auth/login", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(payload),
          cache: "no-store",
        });
        setUser(result.user ?? null);
        setProfile(result.user ?? null);
        const nextTokens = extractTokens(result);
        setTokens(nextTokens);
        setStoredAuthTokens(nextTokens);
      }),
    [withAction],
  );

  const authorizedHeaders = useCallback(() => {
    if (!tokens) {
      throw new Error(t("errors.notSignedIn"));
    }
    return {
      ...JSON_HEADERS,
      Authorization: `Bearer ${tokens.accessToken}`,
    } as HeadersInit;
  }, [t, tokens]);

  const logout = useCallback(
    async () =>
      withAction("logout", async () => {
        if (!tokens) {
          throw new Error(t("errors.notSignedIn"));
        }
        await fetchJson<{ message: string }>("/api/auth/logout", {
          method: "POST",
          headers: authorizedHeaders(),
          cache: "no-store",
        });
        setUser(null);
        setProfile(null);
        setTokens(null);
        setStoredAuthTokens(null);
      }),
    [authorizedHeaders, t, tokens, withAction],
  );

  const fetchProfile = useCallback(
    async () =>
      withAction("profile", async () => {
        const response = await fetchJson<{ user: AuthPublicUser }>(
          "/api/auth/profile",
          {
            method: "GET",
            headers: authorizedHeaders(),
            cache: "no-store",
          },
        );
        setProfile(response.user);
        setUser(response.user);
      }),
    [authorizedHeaders, withAction],
  );

  const refreshAuth = useCallback(
    async () =>
      withAction("refresh", async () => {
        if (!tokens?.refreshToken) {
          throw new Error(t("errors.refreshTokenMissing"));
        }
        const response = await fetchJson<{ tokens: AuthTokens }>(
          "/api/auth/refresh-token",
          {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
            cache: "no-store",
          },
        );
        const nextTokens = extractTokens(response);
        setTokens(nextTokens);
        setStoredAuthTokens(nextTokens);
      }),
    [t, tokens, withAction],
  );

  const changePassword = useCallback(
    async (payload: ChangePasswordPayload) =>
      withAction("changePassword", async () => {
        await fetchJson<{ message: string }>("/api/auth/change-password", {
          method: "POST",
          headers: authorizedHeaders(),
          body: JSON.stringify(payload),
          cache: "no-store",
        });
      }),
    [authorizedHeaders, withAction],
  );

  return {
    user,
    profile,
    tokens,
    message,
    error,
    loadingAction,
    register,
    login,
    logout,
    fetchProfile,
    refreshAuth,
    changePassword,
    isAuthenticated: Boolean(tokens?.accessToken),
  };
}
