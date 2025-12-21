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
    throw new Error("User not found");
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function assertCredentials({ email, password }: AuthCredentials) {
  if (!email || !password) {
    throw new Error("Thiếu email hoặc mật khẩu");
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
    throw new Error("Thiếu thông tin đăng ký");
  }
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error("Email đã được sử dụng");
  }
  const timestamp = new Date().toISOString();
  const user = saveUser({
    id: randomUUID(),
    email: email.toLowerCase(),
    name,
    password,
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
    throw new Error("Email hoặc mật khẩu không đúng");
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
    throw new Error("Access token không hợp lệ");
  }
  const user = findUserByEmail(email);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }
  return { email, user: toPublicUser(user) };
}

export function refreshTokens(refreshToken: string): AuthTokens {
  const email = verifyToken(refreshToken, "refresh");
  if (!email) {
    throw new Error("Refresh token không hợp lệ");
  }
  revokeTokensByEmail(email);
  return issueTokens(email);
}

export function changePassword(email: string, currentPassword: string, newPassword: string) {
  const user = findUserByEmail(email);
  if (!user || user.password !== currentPassword) {
    throw new Error("Mật khẩu hiện tại không chính xác");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
  }
  const updated = updateUser(email, { password: newPassword });
  return toPublicUser(updated);
}

export function logoutUser(email: string) {
  revokeTokensByEmail(email);
}
