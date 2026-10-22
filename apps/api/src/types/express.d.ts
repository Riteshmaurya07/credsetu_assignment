export interface AuthContext {
  /** Id of the authenticated user, always derived from the access token. */
  userId: string;
  /** Canonical phone number of the authenticated user. */
  phone: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
