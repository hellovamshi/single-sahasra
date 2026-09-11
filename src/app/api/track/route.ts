import { NextResponse } from 'next/server';

// In-memory telemetry log buffer
declare global {
  // eslint-disable-next-line no-var
  var _sahasra_logs: Array<any> | undefined;
}

if (!globalThis._sahasra_logs) {
  globalThis._sahasra_logs = [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Extract Vercel geolocation and network headers
    const country = req.headers.get('x-vercel-ip-country') || 'Unknown';
    const city = req.headers.get('x-vercel-ip-city') || 'Unknown';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'Anonymous';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const entry = {
      ...body,
      id: body.id || Math.random().toString(36).substring(2, 9),
      country,
      city,
      ip: ip.length > 7 ? `${ip.substring(0, 7)}***` : ip, // privacy mask
      userAgent,
      serverTimestamp: Date.now(),
    };

    if (globalThis._sahasra_logs) {
      globalThis._sahasra_logs.unshift(entry);
      if (globalThis._sahasra_logs.length > 100) {
        globalThis._sahasra_logs.pop();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to record log' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    count: globalThis._sahasra_logs?.length || 0,
    logs: globalThis._sahasra_logs || [],
  });
}
