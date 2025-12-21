export type AuthUser = {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthPublicUser = Omit<AuthUser, "password">;

export type AuthCredentials = {
  email: string;
  password: string;
};

export type RegisterPayload = AuthCredentials & {
  name: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthPublicUser;
  tokens: AuthTokens;
};
