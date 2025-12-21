import type { AuthUser } from "@/features/auth/types";

const users = new Map<string, AuthUser>();

export function findUserByEmail(email: string) {
  return users.get(email.toLowerCase()) ?? null;
}

export function saveUser(user: AuthUser) {
  users.set(user.email.toLowerCase(), user);
  return user;
}

export function updateUser(email: string, updates: Partial<AuthUser>) {
  const current = findUserByEmail(email);
  if (!current) {
    throw new Error("User not found");
  }
  const updated: AuthUser = { ...current, ...updates, updatedAt: new Date().toISOString() };
  saveUser(updated);
  return updated;
}

export function listUsers() {
  return Array.from(users.values());
}
