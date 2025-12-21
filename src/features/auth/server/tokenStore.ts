export type TokenType = "access" | "refresh";

type TokenRecord = {
  email: string;
  type: TokenType;
  createdAt: number;
};

const tokens = new Map<string, TokenRecord>();

export function storeToken(token: string, email: string, type: TokenType) {
  tokens.set(token, { email, type, createdAt: Date.now() });
}

export function verifyToken(token: string, type: TokenType) {
  const record = tokens.get(token);
  if (!record || record.type !== type) {
    return null;
  }
  return record.email;
}

export function revokeToken(token: string) {
  tokens.delete(token);
}

export function revokeTokensByEmail(email: string) {
  for (const [token, record] of tokens.entries()) {
    if (record.email === email) {
      tokens.delete(token);
    }
  }
}
