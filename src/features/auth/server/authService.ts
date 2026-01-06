import { randomUUID } from "crypto";
import type {
  AuthCredentials,
  AuthPublicUser,
  AuthResponse,
  AuthTokens,
  RegisterPayload,
} from "@/features/auth/types";
import { findUserByEmail, saveUser, updateUser } from "@/features/auth/server/mockDb";
import { storeToken, verifyToken, revokeTokensByEmail } from "@/features/auth/server/tokenStore";

function toPublicUser(user: ReturnType<typeof findUserByEmail>): AuthPublicUser {
  if (!user) {
    throw new Error("auth.errors.userNotFound");
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image_url: user.image_url,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function assertCredentials({ email, password }: AuthCredentials) {
  if (!email || !password) {
    throw new Error("auth.errors.credentialsMissing");
  }
}

function issueTokens(email: string): AuthTokens {
  const accessToken = `access-${randomUUID()}`;
  const refreshToken = `refresh-${randomUUID()}`;
  storeToken(accessToken, email, "access");
  storeToken(refreshToken, email, "refresh");
  return { accessToken, refreshToken };
}

export function registerUser(payload: RegisterPayload): AuthResponse {
  const { email, password, name } = payload;
  if (!email || !password || !name) {
    throw new Error("auth.errors.registrationInfoMissing");
  }
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error("auth.errors.emailInUse");
  }
  const timestamp = new Date().toISOString();
  const user = saveUser({
    id: randomUUID(),
    email: email.toLowerCase(),
    name,
    password,
    image_url: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const tokens = issueTokens(user.email);
  return { user: toPublicUser(user), tokens };
}

export function loginUser(credentials: AuthCredentials): AuthResponse {
  assertCredentials(credentials);
  const user = findUserByEmail(credentials.email);
  if (!user || user.password !== credentials.password) {
    throw new Error("auth.errors.invalidCredentials");
  }
  revokeTokensByEmail(user.email);
  const tokens = issueTokens(user.email);
  return { user: toPublicUser(user), tokens };
}

export function getUserFromAccessToken(token: string) {
  const email = verifyToken(token, "access");
  if (!email) {
    return null;
  }
  const user = findUserByEmail(email);
  if (!user) {
    return null;
  }
  return toPublicUser(user);
}

export function requireAuthContext(token: string) {
  const email = verifyToken(token, "access");
  if (!email) {
    throw new Error("auth.errors.accessTokenInvalid");
  }
  const user = findUserByEmail(email);
  if (!user) {
    throw new Error("auth.errors.userNotFound");
  }
  return { email, user: toPublicUser(user) };
}

export function refreshTokens(refreshToken: string): AuthTokens {
  const email = verifyToken(refreshToken, "refresh");
  if (!email) {
    throw new Error("auth.errors.refreshTokenInvalid");
  }
  revokeTokensByEmail(email);
  return issueTokens(email);
}

export function changePassword(email: string, currentPassword: string, newPassword: string) {
  const user = findUserByEmail(email);
  if (!user || user.password !== currentPassword) {
    throw new Error("auth.errors.currentPasswordInvalid");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error("auth.errors.newPasswordTooShort");
  }
  const updated = updateUser(email, { password: newPassword });
  return toPublicUser(updated);
}

export function updateProfile(email: string, name: string, image_url?: string) {
  if (!name?.trim()) {
    throw new Error("auth.errors.profileInfoMissing");
  }
  const user = findUserByEmail(email);
  if (!user) {
    throw new Error("auth.errors.userNotFound");
  }
  const updated = updateUser(email, { name: name.trim(), image_url });
  return toPublicUser(updated);
}

export function logoutUser(email: string) {
  revokeTokensByEmail(email);
}
