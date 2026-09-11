'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllMetrics, DashboardMetrics, ActivityLogEntry } from '../../analytics/tracker';

const DEFAULT_PIN = 'sahasra2026';
const AUTH_KEY = 'sahasra_admin_auth_v1';

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(15); // seconds (0 = off)
  const [filterDevice, setFilterDevice] = useState<string>('all');

  // Check auth session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(AUTH_KEY);
      if (stored === 'authenticated') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === DEFAULT_PIN) {
      sessionStorage.setItem(AUTH_KEY, 'authenticated');
      setIsAuthenticated(true);
      setErrorMsg(null);
    } else {
      setErrorMsg('Incorrect Passcode. Try again.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setPinInput('');
  };

  // Load metrics
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllMetrics();
      setMetrics(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Auto refresh interval
  useEffect(() => {
    if (!isAuthenticated || autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      loadData();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefreshInterval, loadData]);

  // If not authenticated: Show Passcode Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <svg className="w-7 h-7 text-black fill-current" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Sahasra Solo Admin</h1>
            <p className="text-sm text-white/50 mt-1">
              Enter passcode to unlock analytics and visitor metrics
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5 uppercase tracking-wider">
                Admin Passcode
              </label>
              <input
                type="password"
                placeholder="Enter passcode"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition text-center tracking-widest text-lg font-mono"
              />
              <p className="text-[11px] text-white/40 mt-1.5 text-center">
                Default: <span className="font-mono text-emerald-400/90 font-semibold">{DEFAULT_PIN}</span>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-lg shadow-emerald-500/20 transition-all active:scale-98"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculated stats
  const totalViews = metrics?.views ?? 0;
  const uniqueVisitors = metrics?.visitors ?? 0;
  const androidViews = metrics?.androidViews ?? 0;
  const iphoneViews = metrics?.iphoneViews ?? 0;
  const desktopViews = metrics?.desktopViews ?? 0;

  const totalDevices = (androidViews + iphoneViews + desktopViews) || 1;
  const androidPct = Math.round((androidViews / totalDevices) * 100);
  const iphonePct = Math.round((iphoneViews / totalDevices) * 100);
  const desktopPct = Math.max(0, 100 - androidPct - iphonePct);

  const whatsappTotalClicks = (metrics?.whatsappCoinClicks ?? 0) + (metrics?.whatsappPopupClicks ?? 0);
  const instagramClicks = metrics?.instagramClicks ?? 0;
  const totalSocialClicks = whatsappTotalClicks + instagramClicks;

  const installPrompts = metrics?.installPromptsShown ?? 0;
  const installsAccepted = metrics?.installsAccepted ?? 0;
  const installConversion = installPrompts > 0 ? Math.round((installsAccepted / installPrompts) * 100) : 0;

  const logs = metrics?.recentLogs ?? [];
  const filteredLogs = logs.filter((log) => filterDevice === 'all' || log.device.toLowerCase() === filterDevice.toLowerCase());

  return (
    <div className="min-h-screen bg-[#07090E] text-white p-4 sm:p-6 md:p-8 selection:bg-emerald-500/30 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Navbar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-bold shadow-md shadow-emerald-500/20">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Sahasra Solo</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE TRACKING
                </span>
              </div>
              <p className="text-xs text-white/50">
                Target: <a href="https://solo.sahasra.tech" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">solo.sahasra.tech</a>
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
              <span>Auto-refresh:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-neutral-900 text-white">Off</option>
                <option value={10} className="bg-neutral-900 text-white">10s</option>
                <option value={15} className="bg-neutral-900 text-white">15s</option>
                <option value={30} className="bg-neutral-900 text-white">30s</option>
                <option value={60} className="bg-neutral-900 text-white">1m</option>
              </select>
            </div>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium border border-white/10 transition active:scale-95 disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition"
            >
              Open Site ↗
            </a>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition"
              title="Logout from Admin"
            >
              Logout
            </button>
          </div>
        </header>

        {/* KPI Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 1. Total Pageviews */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-white/50 mb-2">
              <span>TOTAL IMPRESSIONS</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </span>
            </div>
            <div className="text-3xl font-bold tracking-tight text-white mb-1">
              {totalViews.toLocaleString()}
            </div>
            <p className="text-[11px] text-white/50">
              Total times folded / opened
            </p>
          </div>

          {/* 2. Unique Visitors */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-white/50 mb-2">
              <span>UNIQUE VISITORS</span>
              <span className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
            </div>
            <div className="text-3xl font-bold tracking-tight text-white mb-1">
              {uniqueVisitors.toLocaleString()}
            </div>
            <p className="text-[11px] text-white/50">
              Individual unique devices
            </p>
          </div>

          {/* 3. Community Engagement (WhatsApp + Instagram) */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-white/50 mb-2">
              <span>SOCIAL CLICKS</span>
              <span className="p-1.5 rounded-lg bg-pink-500/15 text-pink-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </span>
            </div>
            <div className="text-3xl font-bold tracking-tight text-white mb-1">
              {totalSocialClicks.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/50">
              <span className="text-emerald-400 font-medium">WA: {whatsappTotalClicks}</span>
              <span>•</span>
              <span className="text-pink-400 font-medium">IG: {instagramClicks}</span>
            </div>
          </div>

          {/* 4. PWA Installs */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-white/50 mb-2">
              <span>PWA HOME SCREEN</span>
              <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </span>
            </div>
            <div className="text-3xl font-bold tracking-tight text-white mb-1">
              {installsAccepted.toLocaleString()}
            </div>
            <p className="text-[11px] text-white/50">
              {installConversion}% conversion ({installPrompts} prompts)
            </p>
          </div>
        </section>

        {/* Middle Section: Device Distribution & Conversion Funnel */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Device Breakdown */}
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Device Breakdown</h2>
              <span className="text-xs text-white/40">Total: {totalDevices} devices</span>
            </div>

            {/* Visual Bar */}
            <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden flex gap-0.5">
              <div
                style={{ width: `${androidPct}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Android: ${androidPct}%`}
              />
              <div
                style={{ width: `${iphonePct}%` }}
                className="bg-sky-500 h-full transition-all duration-500"
                title={`iPhone: ${iphonePct}%`}
              />
              <div
                style={{ width: `${desktopPct}%` }}
                className="bg-purple-500 h-full transition-all duration-500"
                title={`Desktop: ${desktopPct}%`}
              />
            </div>

            {/* List */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Android
                </div>
                <div className="text-lg font-bold">{androidViews}</div>
                <div className="text-[10px] text-white/40">{androidPct}% share</div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium mb-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  iPhone
                </div>
                <div className="text-lg font-bold">{iphoneViews}</div>
                <div className="text-[10px] text-white/40">{iphonePct}% share</div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium mb-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  Desktop
                </div>
                <div className="text-lg font-bold">{desktopViews}</div>
                <div className="text-[10px] text-white/40">{desktopPct}% share</div>
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Conversion & Actions</h2>
              <span className="text-xs text-white/40">Funnel metrics</span>
            </div>

            <div className="space-y-3">
              {/* WhatsApp Breakdown */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    WA
                  </div>
                  <div>
                    <div className="text-xs font-semibold">WhatsApp Channel Clicks</div>
                    <div className="text-[10px] text-white/40">Bottom coin: {metrics?.whatsappCoinClicks ?? 0} | Popup: {metrics?.whatsappPopupClicks ?? 0}</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-emerald-400">{whatsappTotalClicks}</div>
              </div>

              {/* Instagram Breakdown */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
                    IG
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Instagram @sahasra.tech</div>
                    <div className="text-[10px] text-white/40">Follow clicks from community sheet</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-pink-400">{instagramClicks}</div>
              </div>

              {/* Install Sheet Acceptance */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    PWA
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Install Prompt Acceptance</div>
                    <div className="text-[10px] text-white/40">Shown: {installPrompts} | Dismissed: {metrics?.installsDismissed ?? 0}</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-amber-400">{installsAccepted}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Visitor & Activity Log */}
        <section className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Live Activity & Telemetry</h2>
              <p className="text-xs text-white/50">Real-time interaction stream captured in backend session</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-xs">
              {['all', 'android', 'iphone', 'desktop'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterDevice(tab)}
                  className={`px-3 py-1 rounded-lg capitalize transition ${
                    filterDevice === tab
                      ? 'bg-emerald-500 text-black font-semibold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-2xl">
              No telemetry events recorded yet. Activity will stream here live as users open the app.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/70">
                <thead className="text-[11px] text-white/40 uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-2.5 px-3">Event</th>
                    <th className="py-2.5 px-3">Device / OS</th>
                    <th className="py-2.5 px-3">Browser</th>
                    <th className="py-2.5 px-3">Location / IP</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLogs.map((log: ActivityLogEntry) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-2.5 px-3 font-medium text-white">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                          log.eventType.includes('click')
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : log.eventType.includes('install')
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-white/10 text-white/80'
                        }`}>
                          {log.eventType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{log.device}</td>
                      <td className="py-2.5 px-3">{log.browser}</td>
                      <td className="py-2.5 px-3 text-white/50">
                        {log.city && log.country ? `${log.city}, ${log.country}` : 'Live visitor'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${log.isPWA ? 'bg-purple-500/20 text-purple-300' : 'text-white/40'}`}>
                          {log.isPWA ? 'PWA App' : 'Browser'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-white/40 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40 pt-4 pb-8 border-t border-white/5">
          <div>
            Sahasra Solo Analytics Engine • Last updated: {lastRefreshed.toLocaleTimeString()}
          </div>
          <div>
            Powered by <a href="https://ainox.in" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white">ainox.in</a>
          </div>
        </footer>

      </div>
    </div>
  );
}
