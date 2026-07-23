export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  walletAddress: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
