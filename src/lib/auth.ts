import crypto from 'crypto';

// Secret admin password strictly loaded from environment variables (e.g. Vercel or .env.local)
// NEVER hardcoded in source control to keep open-source repositories 100% secure.
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SALT = process.env.ADMIN_SALT || 'sahasra-solo-auth-salt-v1';

// Deterministic server-side token based on password and secret salt
export function getAdminAuthToken(): string | null {
  if (!ADMIN_PASSWORD) return null;
  return crypto.createHash('sha256').update(ADMIN_PASSWORD + SALT).digest('hex');
}
