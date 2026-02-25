"use client";

import { useCallback, useEffect, useState } from "react";
import {
	fetchJson,
	setStoredAuthTokens,
	type StoredAuthTokens,
} from "@/lib/api/client";
import type {
	AuthCredentials,
	AuthPublicUser,
	RegisterPayload,
} from "@/features/auth/types";
import { useLocale } from "@/hooks/useLocale";

const JSON_HEADERS = { "Content-Type": "application/json" };

type SessionState = {
	user: AuthPublicUser | null;
	authenticated: boolean;
};

type AuthAction = "login" | "logout" | "register" | "refresh" | "profile";

type AuthResponsePayload = {
	message?: string;
	data?: Record<string, unknown>;
	user?: AuthPublicUser | null;
	tokens?: Record<string, unknown>;
};

type AuthSessionPayload = {
	authenticated?: boolean;
};

type TokenRecord = Record<string, unknown>;

function extractTokens(payload: unknown): StoredAuthTokens | null {
	if (!payload || typeof payload !== "object") {
		return null;
	}
	const record = payload as TokenRecord;
	const sources: TokenRecord[] = [];
	if (record.data && typeof record.data === "object") {
		sources.push(record.data as TokenRecord);
	}
	if (record.tokens && typeof record.tokens === "object") {
		sources.push(record.tokens as TokenRecord);
	}
	sources.push(record);

	const readString = (value: unknown) =>
		typeof value === "string" ? value : undefined;
	const readNumber = (value: unknown) =>
		typeof value === "number" && Number.isFinite(value) ? value : undefined;

	for (const source of sources) {
		const accessToken = readString(source.accessToken ?? source.access_token);
		const refreshToken = readString(
			source.refreshToken ?? source.refresh_token,
		);
		if (accessToken && refreshToken) {
			return {
				accessToken,
				refreshToken,
				expiresIn: readNumber(source.expiresIn ?? source.expires_in),
			};
		}
	}

	return null;
}

function extractUser(payload: AuthResponsePayload): AuthPublicUser | null {
	if (payload.user) {
		return payload.user;
	}

	if (payload.data && typeof payload.data === "object") {
		const nestedUser = (payload.data as TokenRecord).user as
			| AuthPublicUser
			| null
			| undefined;
		return nestedUser ?? null;
	}

	return null;
}

export function useAuthSession() {
	const { t } = useLocale();
	const [session, setSession] = useState<SessionState | null>(null);
	const [loadingAction, setLoadingAction] = useState<AuthAction | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setHydrated(true);
	}, []);

	const login = useCallback(
		async (payload: AuthCredentials) => {
			setLoadingAction("login");
			setError(null);
			try {
				const { restaurantId, ...rest } = payload;
				const loginPayload =
					typeof restaurantId === "number" && Number.isFinite(restaurantId)
						? { ...rest, restaurant_id: restaurantId }
						: rest;
				const response = await fetchJson<AuthResponsePayload>(
					"/api/auth/login",
					{
						method: "POST",
						headers: JSON_HEADERS,
						body: JSON.stringify(loginPayload),
					},
				);
				const tokens = extractTokens(response);
				if (!tokens) {
					const message = t("auth.errors.missingTokenFromServer");
					setError(message);
					throw new Error(message);
				}
				setStoredAuthTokens(tokens);
				const sessionState = await fetchJson<AuthSessionPayload>(
					"/api/auth/session",
					{
						method: "GET",
						cache: "no-store",
						credentials: "include",
					},
				);
				if (!sessionState.authenticated) {
					setStoredAuthTokens(null);
					const message = "Login succeeded but auth cookie was not set.";
					setError(message);
					throw new Error(message);
				}
				const user = extractUser(response);
				setSession({ authenticated: true, user });
				return response;
			} catch (err) {
				const message =
					err instanceof Error ? err.message : t("auth.errors.loginFailed");
				setError(message);
				throw err;
			} finally {
				setLoadingAction(null);
			}
		},
		[t],
	);

	const register = useCallback(
		async (payload: RegisterPayload) => {
			setLoadingAction("register");
			setError(null);
			try {
				const response = await fetchJson<AuthResponsePayload>(
					"/api/auth/register",
					{
						method: "POST",
						headers: JSON_HEADERS,
						body: JSON.stringify(payload),
					},
				);
				const tokens = extractTokens(response);
				if (tokens) {
					setStoredAuthTokens(tokens);
				}
				const user = extractUser(response);
				setSession({
					authenticated: Boolean(tokens?.accessToken) || Boolean(user),
					user,
				});
				return response;
			} catch (err) {
				const message =
					err instanceof Error ? err.message : t("auth.errors.registerFailed");
				setError(message);
				throw err;
			} finally {
				setLoadingAction(null);
			}
		},
		[t],
	);

	const fetchProfile = useCallback(async () => {
		if (!session?.authenticated) {
			setError(t("errors.notSignedIn"));
			return null;
		}
		setLoadingAction("profile");
		setError(null);
		const profile = session.user ?? null;
		setLoadingAction(null);
		return profile;
	}, [session, t]);

	const refresh = useCallback(async () => {
		setLoadingAction("refresh");
		setError(t("auth.errors.refreshUnsupported"));
		setLoadingAction(null);
		return null;
	}, [t]);

	const logout = useCallback(async () => {
		setLoadingAction("logout");
		setError(null);
		try {
			await fetchJson<{ message: string }>("/api/auth/logout", {
				method: "POST",
			});
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t("auth.errors.logoutFailed");
			setError(message);
			throw err;
		} finally {
			setStoredAuthTokens(null);
			setSession(null);
			setLoadingAction(null);
		}
	}, [t]);

	return {
		session,
		hydrated,
		loadingAction,
		error,
		login,
		register,
		logout,
		refresh,
		fetchProfile,
	};
}
