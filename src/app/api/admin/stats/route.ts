import { NextResponse } from 'next/server';

const BASE_URL = 'https://abacus.jasoncameron.dev';
const NAMESPACE = 'sahasra-solo';

declare global {
  // eslint-disable-next-line no-var
  var _sahasra_logs: Array<any> | undefined;
}

async function getCounter(key: string): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/get/${NAMESPACE}/${key}`, { cache: 'no-store' });
    const data = await res.json();
    return data?.value ?? 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const [
      views,
      visitors,
      androidViews,
      iphoneViews,
      desktopViews,
      whatsappCoinClicks,
      whatsappPopupClicks,
      instagramClicks,
      installPromptsShown,
      installsAccepted,
      installsDismissed,
      socialPopupsShown,
      socialPopupsDismissed,
    ] = await Promise.all([
      getCounter('pageviews'),
      getCounter('visitors'),
      getCounter('android-views'),
      getCounter('iphone-views'),
      getCounter('desktop-views'),
      getCounter('whatsapp-coin-clicks'),
      getCounter('whatsapp-popup-clicks'),
      getCounter('instagram-clicks'),
      getCounter('install-prompts-shown'),
      getCounter('installs-accepted'),
      getCounter('installs-dismissed'),
      getCounter('social-popups-shown'),
      getCounter('social-popups-dismissed'),
    ]);

    return NextResponse.json({
      views,
      visitors,
      androidViews,
      iphoneViews,
      desktopViews,
      whatsappCoinClicks,
      whatsappPopupClicks,
      instagramClicks,
      installPromptsShown,
      installsAccepted,
      installsDismissed,
      socialPopupsShown,
      socialPopupsDismissed,
      recentLogs: globalThis._sahasra_logs || [],
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
