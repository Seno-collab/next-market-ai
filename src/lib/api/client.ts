import { toast } from "react-toastify";

const isBrowser = typeof globalThis.window !== "undefined";
const toastCooldownMs = 1200;
const lastToastByMessage = new Map<string, number>();
const LOCALE_STORAGE_KEY = "next-market-ai-locale";
const AUTH_TOKENS_STORAGE_KEY = "next-market-ai-auth-tokens";
const RESTAURANT_ID_STORAGE_KEY = "next-market-ai-restaurant-id";
const RESTAURANT_HEADER_NAME = "X-Restaurant-ID";
export const RESTAURANT_ID_CHANGE_EVENT = "restaurant-id-change";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const AUTH_REFRESH_PATH = "/api/auth/refresh-token";
const AUTH_LOGOUT_PATH = "/api/auth/logout";
const LOGIN_PATH = "/login";
const logPrefix = "[api]";
let refreshPromise: Promise<StoredAuthTokens | null> | null = null;
let logoutPromise: Promise<void> | null = null;

type ToastKind = "error" | "success" | "warning";

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  expiresAt?: number;
  issuedAt?: number;
};

type TokenRecord = Record<string, unknown>;

function normalizeEpochMs(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value < 1_000_000_000_000 ? value * 1000 : value;
}

async function getErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) {
        return payload.message;
      }
      return JSON.stringify(payload);
    } catch {
      return response.statusText;
    }
  }

  try {
    const text = await response.text();
    return text || response.statusText;
  } catch {
    return response.statusText;
  }
}

function notify(kind: ToastKind, message: string) {
  if (isBrowser) {
    const now = Date.now();
    const key = `${kind}:${message}`;
    const lastShown = lastToastByMessage.get(key) ?? 0;
    if (now - lastShown < toastCooldownMs) {
      return;
    }
    lastToastByMessage.set(key, now);
    if (lastToastByMessage.size > 50) {
      lastToastByMessage.clear();
    }
    const toastId = `${kind}:${message}`;
    if (kind === "success") {
      toast.success(message, { toastId });
      return;
    }
    if (kind === "warning") {
      toast.warning(message, { toastId });
      return;
    }
    toast.error(message, { toastId });
  }
}

export function getStoredAuthTokens(): StoredAuthTokens | null {
  if (!isBrowser) {
    return null;
  }
  const raw = globalThis.window.localStorage.getItem(AUTH_TOKENS_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthTokens>;
    if (
      typeof parsed?.accessToken !== "string" ||
      typeof parsed?.refreshToken !== "string"
    ) {
      return null;
    }
    const expiresAt = normalizeEpochMs(
      typeof parsed.expiresAt === "number" ? parsed.expiresAt : undefined
    );
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresIn:
        typeof parsed.expiresIn === "number" ? parsed.expiresIn : undefined,
      expiresAt,
      issuedAt:
        typeof parsed.issuedAt === "number" ? parsed.issuedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function setStoredAuthTokens(tokens: StoredAuthTokens | null) {
  if (!isBrowser) {
    return;
  }
  if (!tokens) {
    globalThis.window.localStorage.removeItem(AUTH_TOKENS_STORAGE_KEY);
    return;
  }
  const issuedAt =
    typeof tokens.issuedAt === "number" && Number.isFinite(tokens.issuedAt)
      ? tokens.issuedAt
      : Date.now();
  const expiresAt = resolveExpiresAt({ ...tokens, issuedAt });
  const normalized: StoredAuthTokens = {
    ...tokens,
    issuedAt,
  };
  if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
    normalized.expiresAt = expiresAt;
  }
  globalThis.window.localStorage.setItem(
    AUTH_TOKENS_STORAGE_KEY,
    JSON.stringify(normalized)
  );
}

export function getStoredRestaurantId() {
  if (!isBrowser) {
    return null;
  }
  const raw = globalThis.window.localStorage.getItem(
    RESTAURANT_ID_STORAGE_KEY
  );
  if (!raw) {
    return null;
  }
  return raw;
}

export function setStoredRestaurantId(
  restaurantId: number | string | null
) {
  if (!isBrowser) {
    return;
  }
  const currentValue = getStoredRestaurantId();
  if (
    restaurantId === null ||
    restaurantId === undefined ||
    (typeof restaurantId === "number" && !Number.isFinite(restaurantId))
  ) {
    globalThis.window.localStorage.removeItem(RESTAURANT_ID_STORAGE_KEY);
    if (currentValue !== null) {
      dispatchRestaurantIdChange(null);
    }
    return;
  }
  const value =
    typeof restaurantId === "number"
      ? String(restaurantId)
      : restaurantId.trim();
  if (!value) {
    globalThis.window.localStorage.removeItem(RESTAURANT_ID_STORAGE_KEY);
    if (currentValue !== null) {
      dispatchRestaurantIdChange(null);
    }
    return;
  }
  if (currentValue === value) {
    return;
  }
  globalThis.window.localStorage.setItem(
    RESTAURANT_ID_STORAGE_KEY,
    value
  );
  dispatchRestaurantIdChange(value);
}

function dispatchRestaurantIdChange(restaurantId: string | null) {
  if (!isBrowser) {
    return;
  }
  globalThis.window.dispatchEvent(
    new CustomEvent(RESTAURANT_ID_CHANGE_EVENT, { detail: { restaurantId } })
  );
}

function extractStoredTokens(payload: unknown): StoredAuthTokens | null {
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
  const readEpochMs = (value: unknown) =>
    normalizeEpochMs(readNumber(value));

  for (const source of sources) {
    const accessToken = readString(source.accessToken ?? source.access_token);
    const refreshToken = readString(
      source.refreshToken ?? source.refresh_token
    );
    if (accessToken && refreshToken) {
      return {
        accessToken,
        refreshToken,
        expiresIn: readNumber(source.expiresIn ?? source.expires_in),
        expiresAt: readEpochMs(source.expiresAt ?? source.expires_at),
      };
    }
  }

  return null;
}

function shouldSkipAuth(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const value = headers.get("x-skip-auth");
  return value === "true" || value === "1" || value === "yes";
}

function withAuthHeader(init: RequestInit | undefined, accessToken: string) {
  if (shouldSkipAuth(init)) {
    const headers = new Headers(init?.headers);
    headers.delete("x-skip-auth");
    return { ...init, headers };
  }
  const headers = new Headers(init?.headers);
  headers.delete("x-skip-auth");
  headers.set("authorization", `Bearer ${accessToken}`);
  return { ...init, headers };
}

function withLocaleHeader(init?: RequestInit) {
  if (!isBrowser) {
    return init;
  }
  const headers = new Headers(init?.headers);
  const skipAuth = shouldSkipAuth(init);
  headers.delete("x-skip-auth");
  const storedLocale =
    globalThis.window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (storedLocale === "vi" || storedLocale === "en") {
    headers.set("x-locale", storedLocale);
  }
  if (!skipAuth) {
    const tokens = getStoredAuthTokens();
    if (tokens?.accessToken && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${tokens.accessToken}`);
    }
    const restaurantId = getStoredRestaurantId();
    if (restaurantId && !headers.has(RESTAURANT_HEADER_NAME)) {
      headers.set(RESTAURANT_HEADER_NAME, restaurantId);
    }
  }
  return {
    ...init,
    headers,
    credentials: init?.credentials ?? ("include" as RequestCredentials),
  };
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function resolveRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  const request =
    typeof input === "object" &&
    input !== null &&
    "method" in input &&
    typeof input.method === "string"
      ? (input as Request)
      : null;
  return request?.method?.toUpperCase() ?? init?.method?.toUpperCase() ?? "GET";
}

function formatRequestUrl(input: RequestInfo | URL) {
  const url = resolveRequestUrl(input);
  try {
    const base = isBrowser ? globalThis.window.location.origin : "http://localhost";
    const parsed = new URL(url, base);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function isRefreshRequest(input: RequestInfo | URL) {
  const url = resolveRequestUrl(input);
  return url.includes(AUTH_REFRESH_PATH);
}

function isLogoutRequest(input: RequestInfo | URL) {
  const url = resolveRequestUrl(input);
  return url.includes(AUTH_LOGOUT_PATH);
}

function redirectToLogin() {
  if (!isBrowser) {
    return;
  }
  if (globalThis.window.location.pathname === LOGIN_PATH) {
    return;
  }
  globalThis.window.location.replace(LOGIN_PATH);
}

function decodeBase64Url(value: string) {
  if (!isBrowser || typeof globalThis.atob !== "function") {
    return null;
  }
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "="
    );
    return globalThis.atob(padded);
  } catch {
    return null;
  }
}

function parseJwtExpiry(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) {
    return null;
  }
  try {
    const payload = JSON.parse(decoded) as { exp?: number };
    if (typeof payload.exp === "number" && Number.isFinite(payload.exp)) {
      return payload.exp * 1000;
    }
  } catch {
    return null;
  }
  return null;
}

function resolveExpiresAt(tokens: StoredAuthTokens) {
  const normalizedExpiresAt = normalizeEpochMs(tokens.expiresAt);
  if (normalizedExpiresAt) {
    return normalizedExpiresAt;
  }
  const jwtExpiresAt = parseJwtExpiry(tokens.accessToken);
  if (jwtExpiresAt) {
    return jwtExpiresAt;
  }
  if (typeof tokens.expiresIn === "number" && Number.isFinite(tokens.expiresIn)) {
    const issuedAt =
      typeof tokens.issuedAt === "number" && Number.isFinite(tokens.issuedAt)
        ? tokens.issuedAt
        : null;
    if (issuedAt !== null) {
      return issuedAt + tokens.expiresIn * 1000;
    }
  }
  return null;
}

function isTokenExpired(tokens: StoredAuthTokens) {
  const expiresAt = resolveExpiresAt(tokens);
  if (!expiresAt) {
    return false;
  }
  return Date.now() >= expiresAt;
}

async function expireSession() {
  if (!isBrowser) {
    return;
  }
  if (logoutPromise) {
    await logoutPromise;
    return;
  }
  logoutPromise = (async () => {
    setStoredAuthTokens(null);
    try {
      const initWithLocale = withLocaleHeader({ method: "POST" });
      await fetch(AUTH_LOGOUT_PATH, initWithLocale);
    } catch {
      // Ignore network errors; local session is already cleared.
    }
  })();
  try {
    await logoutPromise;
  } finally {
    logoutPromise = null;
  }
}

async function refreshIfTokenExpired(input: RequestInfo | URL) {
  if (!isBrowser || isRefreshRequest(input) || isLogoutRequest(input)) {
    return;
  }
  const tokens = getStoredAuthTokens();
  if (!tokens) {
    return;
  }
  if (!isTokenExpired(tokens)) {
    return;
  }
  if (!tokens.refreshToken) {
    await expireSession();
    return;
  }
  const refreshed = await refreshAuthTokens();
  if (!refreshed?.accessToken) {
    await expireSession();
  }
}

async function refreshAuthTokens(): Promise<StoredAuthTokens | null> {
  if (!isBrowser) {
    return null;
  }
  const stored = getStoredAuthTokens();
  if (!stored?.refreshToken) {
    return null;
  }
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    const handleRefreshFailure = async () => {
      await expireSession();
      redirectToLogin();
      return null;
    };
    try {
      const initWithLocale = withLocaleHeader({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      });
      const headers = new Headers(initWithLocale?.headers);
      headers.delete("authorization");
      const response = await fetch(AUTH_REFRESH_PATH, {
        ...initWithLocale,
        headers,
      });
      if (!response.ok) {
        return handleRefreshFailure();
      }
      const data = (await response.json().catch(() => ({}))) as TokenRecord;
      const tokens = extractStoredTokens(data);
      if (!tokens) {
        return handleRefreshFailure();
      }
      setStoredAuthTokens(tokens);
      return tokens;
    } catch {
      return handleRefreshFailure();
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/** Clear localStorage tokens + auth cookie, then redirect to /login. */
export async function signOut() {
  await expireSession();
  redirectToLogin();
}

export function notifySuccess(message: string) {
  notify("success", message);
}

export function notifyWarning(message: string) {
  notify("warning", message);
}

export function notifyError(message: string) {
  notify("error", message);
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const skipAuth = shouldSkipAuth(init);
  const shouldLog = process.env.NODE_ENV === "development";
  const method = shouldLog ? resolveRequestMethod(input, init) : "GET";
  const url = shouldLog ? formatRequestUrl(input) : "";
  const start = shouldLog ? Date.now() : 0;
  if (shouldLog) {
    console.info(`${logPrefix} ${method} ${url} -> start`);
  }
  if (!skipAuth) {
    await refreshIfTokenExpired(input);
  }
  let response: Response;
  try {
    response = await fetch(input, withLocaleHeader(init));
  } catch (error) {
    if (shouldLog) {
      const duration = Date.now() - start;
      console.error(
        `${logPrefix} ${method} ${url} -> ERROR ${duration}ms`,
        error
      );
    }
    const message = error instanceof Error ? error.message : "Network error";
    notifyError(message);
    throw new Error(message);
  }
  if (shouldLog) {
    const duration = Date.now() - start;
    console.info(
      `${logPrefix} ${method} ${url} -> ${response.status} ${duration}ms`
    );
  }

  if (!response.ok) {
    // Redirect to 500 page for server errors
    if (isBrowser && response.status >= 500) {
      const message = await getErrorMessage(response);
      // Store error info for the error page
      sessionStorage.setItem("api_error", JSON.stringify({
        status: response.status,
        message,
        url: formatRequestUrl(input),
        timestamp: Date.now(),
      }));
      // Redirect to error page
      globalThis.window.location.href = "/error-500";
      // Throw to stop execution
      throw new Error(message);
    }

    // 401 → clear session and redirect to login immediately
    if (
      isBrowser &&
      response.status === 401 &&
      !isRefreshRequest(input) &&
      !isLogoutRequest(input) &&
      !skipAuth
    ) {
      const message = await getErrorMessage(response);
      await expireSession();
      redirectToLogin();
      throw new Error(message);
    }

    const message = await getErrorMessage(response);
    notifyError(message);
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function resolveApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (!API_BASE_URL) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function fetchApiJson<T>(path: string, init?: RequestInit) {
  return fetchJson<T>(resolveApiUrl(path), init);
}
