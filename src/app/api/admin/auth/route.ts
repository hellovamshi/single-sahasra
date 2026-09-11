import { NextResponse } from 'next/server';
import { verifyAdminPassword, getAdminAuthToken } from '@/lib/auth';

// Rate limiting state per IP
const attemptMap = new Map<string, { count: number; lockedUntil: number }>();

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();

    // Check rate limit lock
    const attempt = attemptMap.get(ip);
    if (attempt && attempt.lockedUntil > now) {
      return NextResponse.json(
        { success: false, error: 'Access Denied' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawPassword = typeof body?.password === 'string' ? body.password : '';
    const password = rawPassword.trim();

    // Reject empty input
    if (!password) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ success: false, error: 'Access Denied' }, { status: 401 });
    }

    // Verify password strictly
    const isMatch = verifyAdminPassword(password);

    if (isMatch) {
      attemptMap.delete(ip);
      const token = getAdminAuthToken();
      return NextResponse.json({
        success: true,
        token,
      });
    }

    // Track failed attempts
    const current = attemptMap.get(ip) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= 8) {
      current.lockedUntil = now + 10 * 60 * 1000; // 10 minute lock
    }
    attemptMap.set(ip, current);

    // Artificial delay to prevent brute-force
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ success: false, error: 'Access Denied' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Access Denied' }, { status: 401 });
  }
}
