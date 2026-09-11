/**
 * Lightweight real-time analytics tracker
 * Tracks total pageviews and unique visitors
 */

const BASE_URL = 'https://abacus.jasoncameron.dev';
const NAMESPACE = 'sahasra-solo';
const STORAGE_VISITOR_KEY = 'sahasra_solo_visitor_v1';

export interface TrackingStats {
  views: number;
  visitors: number;
}

export async function trackVisit(): Promise<TrackingStats | null> {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Increment total page views on every visit
    const viewRes = await fetch(`${BASE_URL}/hit/${NAMESPACE}/pageviews`);
    const viewData = await viewRes.json();
    const views = viewData?.value ?? 1;

    // 2. Increment unique visitors only if this device hasn't visited before
    let isNewVisitor = false;
    if (!localStorage.getItem(STORAGE_VISITOR_KEY)) {
      isNewVisitor = true;
      localStorage.setItem(STORAGE_VISITOR_KEY, Date.now().toString());
    }

    let visitors = 1;
    if (isNewVisitor) {
      const visitorRes = await fetch(`${BASE_URL}/hit/${NAMESPACE}/visitors`);
      const visitorData = await visitorRes.json();
      visitors = visitorData?.value ?? 1;
    } else {
      const visitorRes = await fetch(`${BASE_URL}/get/${NAMESPACE}/visitors`);
      const visitorData = await visitorRes.json();
      visitors = visitorData?.value ?? 1;
    }

    return { views, visitors };
  } catch (err) {
    console.warn('Analytics tracking offline:', err);
    return null;
  }
}

export async function getStats(): Promise<TrackingStats> {
  try {
    const [viewRes, visitorRes] = await Promise.all([
      fetch(`${BASE_URL}/get/${NAMESPACE}/pageviews`),
      fetch(`${BASE_URL}/get/${NAMESPACE}/visitors`),
    ]);
    const viewData = await viewRes.json();
    const visitorData = await visitorRes.json();
    return {
      views: viewData?.value ?? 0,
      visitors: visitorData?.value ?? 0,
    };
  } catch {
    return { views: 0, visitors: 0 };
  }
}
