import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { ADMIN_PASSWORD, getAdminAuthToken } from '@/lib/auth';

// Rate limiting state per IP (in-memory per serverless instance)
const attemptMap = new Map<string, { count: number; lockedUntil: number }>();

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();

    // Check rate limit lock
    const attempt = attemptMap.get(ip);
    if (attempt && attempt.lockedUntil > now) {
      const waitSecs = Math.ceil((attempt.lockedUntil - now) / 1000);
      return NextResponse.json(
        { success: false, error: `Too many failed attempts. Locked for ${waitSecs}s.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { password } = body;

    // Check if admin password is configured in server environment
    if (!ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Admin access is not configured. Please set ADMIN_PASSWORD in environment variables.' },
        { status: 503 }
      );
    }

    // Fast reject for obvious invalid inputs
    if (!password || typeof password !== 'string' || password.toLowerCase() === 'admin' || password.length < 6) {
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ success: false, error: 'Access Denied: Invalid credentials' }, { status: 401 });
    }

    // Timing-safe password verification using SHA-256 digests
    const passHash = crypto.createHash('sha256').update(password).digest();
    const targetHash = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
    const isMatch = crypto.timingSafeEqual(passHash, targetHash);

    if (isMatch) {
      // Reset failed attempts on success
      attemptMap.delete(ip);

      const token = getAdminAuthToken();
      return NextResponse.json({
        success: true,
        token,
      });
    }

    // Record failed attempt
    const current = attemptMap.get(ip) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= 5) {
      current.lockedUntil = now + 15 * 60 * 1000; // 15 minute lock
    }
    attemptMap.set(ip, current);

    // Artificial delay to mitigate brute-force
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ success: false, error: 'Access Denied: Incorrect password' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Authentication error' }, { status: 500 });
  }
}
