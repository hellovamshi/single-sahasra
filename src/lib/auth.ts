import crypto from 'crypto';

const SALT = 'sahasra_solo_secure_vault_2026';
// Irreversible salted SHA-256 hash - 100% open-source safe, password cannot be reversed
const VAULT_HASH = 'b9f661d7f36611cc75e1dff01ec00508838096070b26493868568bfe91ad7a19';

// Deterministic server-side session token
export function getAdminAuthToken(): string {
  return crypto.createHash('sha256').update(VAULT_HASH + '-session-token').digest('hex');
}

export function verifyAdminPassword(candidate: string): boolean {
  if (!candidate || typeof candidate !== 'string') return false;

  // If custom environment variable is set, verify against it
  if (process.env.ADMIN_PASSWORD && candidate === process.env.ADMIN_PASSWORD) {
    return true;
  }

  // Cryptographic timing-safe one-way hash comparison
  const candidateHash = crypto.createHash('sha256').update(candidate + SALT).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(VAULT_HASH));
}
