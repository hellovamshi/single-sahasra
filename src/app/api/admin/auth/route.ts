import { NextResponse } from 'next/server';
import { verifyAdminPassword, getAdminAuthToken } from '@/lib/auth';

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
        { success: false, error: `Too many attempts. Please wait ${waitSecs}s.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { password } = body;

    // Fast reject for empty or non-string inputs
    if (!password || typeof password !== 'string') {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ success: false, error: 'Access Denied' }, { status: 401 });
    }

    // Verify password via cryptographic one-way salted hash (or custom env var)
    const isMatch = verifyAdminPassword(password);

    if (isMatch) {
      attemptMap.delete(ip);
      const token = getAdminAuthToken();
      return NextResponse.json({
        success: true,
        token,
      });
    }

    // Track failed attempt
    const current = attemptMap.get(ip) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= 6) {
      current.lockedUntil = now + 15 * 60 * 1000; // 15 min lock
    }
    attemptMap.set(ip, current);

    // Artificial delay to prevent brute-force attacks
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ success: false, error: 'Access Denied' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Access Denied' }, { status: 401 });
  }
}
