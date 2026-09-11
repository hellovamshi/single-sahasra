/**
 * Real-time Analytics Tracker for Sahasra Solo
 * Tracks page views, unique visitors, devices, installs, and social engagement
 */

const BASE_URL = 'https://abacus.jasoncameron.dev';
const NAMESPACE = 'sahasra-solo';
const STORAGE_VISITOR_KEY = 'sahasra_solo_visitor_v1';
const STORAGE_LOGS_KEY = 'sahasra_local_activity_logs';

export type EventType =
  | 'pageview'
  | 'whatsapp_coin_click'
  | 'whatsapp_popup_click'
  | 'instagram_click'
  | 'install_prompt_shown'
  | 'install_accepted'
  | 'install_dismissed'
  | 'social_popup_shown'
  | 'social_popup_dismissed';

export interface DashboardMetrics {
  views: number;
  visitors: number;
  androidViews: number;
  iphoneViews: number;
  desktopViews: number;
  whatsappCoinClicks: number;
  whatsappPopupClicks: number;
  instagramClicks: number;
  installPromptsShown: number;
  installsAccepted: number;
  installsDismissed: number;
  socialPopupsShown: number;
  socialPopupsDismissed: number;
  recentLogs?: ActivityLogEntry[];
}

export interface ActivityLogEntry {
  id: string;
  eventType: EventType;
  device: 'Android' | 'iPhone' | 'Desktop';
  browser: string;
  isPWA: boolean;
  referrer: string;
  city?: string;
  country?: string;
  timestamp: number;
}

// Helper to safely hit counter on Abacus
async function hitCounter(key: string): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/hit/${NAMESPACE}/${key}`);
    const data = await res.json();
    return data?.value ?? 0;
  } catch {
    return 0;
  }
}

// Helper to safely get counter on Abacus
async function getCounter(key: string): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/get/${NAMESPACE}/${key}`);
    const data = await res.json();
    return data?.value ?? 0;
  } catch {
    return 0;
  }
}

// Detect device category
export function detectDevice(): 'Android' | 'iPhone' | 'Desktop' {
  if (typeof navigator === 'undefined') return 'Desktop';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone';
  return 'Desktop';
}

// Detect simple browser name
function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  return 'Mobile Browser';
}

// Save log locally in localStorage (for client inspection & fallback)
function saveLocalLog(entry: ActivityLogEntry) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_LOGS_KEY) || '[]');
    const updated = [entry, ...existing.slice(0, 49)];
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function getLocalLogs(): ActivityLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_LOGS_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Main visit tracker: runs automatically when the site loads
 */
export async function trackVisit(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const device = detectDevice();
    const isApp =
      Boolean((navigator as unknown as { standalone?: boolean }).standalone) ||
      window.matchMedia?.('(display-mode: standalone)').matches;

    // 1. Increment total pageviews
    hitCounter('pageviews');

    // 2. Increment device category
    if (device === 'Android') {
      hitCounter('android-views');
    } else if (device === 'iPhone') {
      hitCounter('iphone-views');
    } else {
      hitCounter('desktop-views');
    }

    // 3. Increment unique visitor if first time on this device
    if (!localStorage.getItem(STORAGE_VISITOR_KEY)) {
      localStorage.setItem(STORAGE_VISITOR_KEY, Date.now().toString());
      hitCounter('visitors');
    }

    // 4. Log telemetry entry locally & send to API
    const entry: ActivityLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      eventType: 'pageview',
      device,
      browser: detectBrowser(),
      isPWA: Boolean(isApp),
      referrer: document.referrer || 'Direct',
      timestamp: Date.now(),
    };
    saveLocalLog(entry);

    // Send to backend API route non-blocking
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {});
  } catch (err) {
    console.warn('Track visit warning:', err);
  }
}

/**
 * Track custom user actions (clicks, installs, popups)
 */
export function trackEvent(eventType: EventType): void {
  if (typeof window === 'undefined') return;

  try {
    const device = detectDevice();
    const isApp =
      Boolean((navigator as unknown as { standalone?: boolean }).standalone) ||
      window.matchMedia?.('(display-mode: standalone)').matches;

    // Map event type to Abacus key
    const keyMap: Record<EventType, string> = {
      pageview: 'pageviews',
      whatsapp_coin_click: 'whatsapp-coin-clicks',
      whatsapp_popup_click: 'whatsapp-popup-clicks',
      instagram_click: 'instagram-clicks',
      install_prompt_shown: 'install-prompts-shown',
      install_accepted: 'installs-accepted',
      install_dismissed: 'installs-dismissed',
      social_popup_shown: 'social-popups-shown',
      social_popup_dismissed: 'social-popups-dismissed',
    };

    const key = keyMap[eventType];
    if (key) {
      hitCounter(key);
    }

    // Log telemetry
    const entry: ActivityLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      eventType,
      device,
      browser: detectBrowser(),
      isPWA: Boolean(isApp),
      referrer: document.referrer || 'Direct',
      timestamp: Date.now(),
    };
    saveLocalLog(entry);

    // Send to backend API route non-blocking
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {});
  } catch (err) {
    console.warn('Track event error:', err);
  }
}

/**
 * Fetch all metrics for Admin Dashboard
 */
export async function fetchAllMetrics(): Promise<DashboardMetrics> {
  try {
    // First try internal backend API
    const apiRes = await fetch('/api/admin/stats').catch(() => null);
    if (apiRes && apiRes.ok) {
      const data = await apiRes.json();
      if (data && typeof data.views === 'number') {
        return data;
      }
    }
  } catch {
    // fallback below
  }

  // Fallback: Query Abacus directly in parallel
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

  return {
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
    recentLogs: getLocalLogs(),
  };
}
