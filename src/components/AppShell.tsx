import {
  BarChart3,
  Bell,
  Crown,
  Home,
  List,
  Monitor,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useMandal } from '../context/MandalContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { MANDAL_DEFAULT_EMBLEM, resolveMandalLogoUrl } from '../types';
import { LiquidGlassNavBar } from './LiquidGlassNavBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    mandal,
    tr,
    toast,
    dismissToast,
    restoreEntry,
    computedTotals,
    effectiveRole,
    simulatedRole,
    setSimulatedRole,
  } = useMandal();
  const { isOnline } = usePWAInstall();
  const location = useLocation();
  const [phonePreviewOnDesktop, setPhonePreviewOnDesktop] = useState(false);

  const sidebarNavItems = [
    { to: '/home', label: tr('home'), icon: Home },
    { to: '/entries', label: tr('entries'), icon: List },
    { to: '/reports', label: tr('reports'), icon: BarChart3 },
    {
      to: '/alerts',
      label: tr('alerts'),
      icon: Bell,
      badge: computedTotals.totalAlertsCount,
    },
    { to: '/mandal', label: tr('mandal'), icon: Crown },
  ];

  const mobileCapsuleItems = useMemo(
    () => [
      { to: '/home', label: tr('home'), icon: Home },
      { to: '/entries', label: tr('entries'), icon: List },
      { to: '/reports', label: tr('reports'), icon: BarChart3 },
      { to: '/mandal', label: tr('mandal'), icon: Crown },
    ],
    [tr],
  );

  return (
    <div className="min-h-[100dvh] bg-[#F5F7FB] text-slate-900 flex flex-col">

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-[#1E3A8A] text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline mode active — entries stay cached and sync when back online</span>
        </div>
      )}

      {/* Role Preview Banner if Admin is testing Collector / Auditor */}
      {simulatedRole && (
        <div className="bg-amber-100 border-b border-amber-300/60 text-amber-950 text-xs font-semibold px-4 py-2 flex items-center justify-between gap-2">
          <span>
            Previewing app as <strong className="uppercase">{simulatedRole}</strong>
          </span>
          <button
            type="button"
            onClick={() => setSimulatedRole(null)}
            className="px-2.5 py-1 rounded-lg bg-amber-900 text-white text-[11px] font-bold whitespace-nowrap shrink-0"
          >
            Exit Preview
          </button>
        </div>
      )}

      {/* Desktop Mode Shell */}
      <div
        className={`flex-1 w-full flex ${
          phonePreviewOnDesktop
            ? 'max-w-[430px] mx-auto shadow-2xl border-x border-slate-200 bg-[#F5F7FB]'
            : 'w-full'
        }`}
      >
        {/* Adaptive Desktop Left Rail (hidden in mobile & phone-preview mode) */}
        {!phonePreviewOnDesktop && (
          <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-slate-200/80 bg-white/85 p-4 justify-between sticky top-0 h-[100dvh]">
            <div className="space-y-5">
              {/* Official UtsavBook Brand Header (Icon + Wordmark) */}
              <div className="flex items-center gap-2.5 px-2 pt-1 pb-3 border-b border-slate-100">
                <img
                  src="/logo-icon.png"
                  alt="UtsavBook emblem"
                  className="w-8 h-8 rounded-xl object-contain bg-white border border-slate-200/80 p-0.5 shadow-2xs shrink-0"
                />
                <img
                  src="/logo-text.png"
                  alt="UtsavBook"
                  className="h-[19px] w-auto object-contain"
                />
              </div>

              {/* Active Mandal Workspace */}
              <div className="flex items-center gap-2.5 px-2">
                <img
                  src={resolveMandalLogoUrl(mandal?.logoUrl)}
                  alt={mandal?.name || 'UtsavBook'}
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith(MANDAL_DEFAULT_EMBLEM)) {
                      e.currentTarget.src = MANDAL_DEFAULT_EMBLEM;
                    }
                  }}
                  className="w-10 h-10 rounded-full object-cover border border-blue-200 bg-blue-50 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 truncate">
                    {mandal?.name || 'UtsavBook'}
                  </div>
                  <div className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                    {effectiveRole}
                  </div>
                </div>
              </div>

              <nav className="space-y-1">
                {sidebarNavItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    location.pathname === item.to ||
                    location.pathname.startsWith(`${item.to}/`);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`flex items-center justify-between px-3.5 min-h-[44px] rounded-xl text-sm font-bold transition-colors ${
                        active
                          ? 'bg-blue-50 text-[#1D4ED8]'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#DC2626] text-white text-[11px] font-extrabold flex items-center justify-center tabular-nums">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setPhonePreviewOnDesktop(true)}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-blue-50/60 hover:border-blue-200"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Frame View</span>
              </button>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col relative pb-[96px] md:pb-6">
          {phonePreviewOnDesktop && (
            <div className="hidden md:flex items-center justify-end px-4 pt-2">
              <button
                type="button"
                onClick={() => setPhonePreviewOnDesktop(false)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 inline-flex items-center gap-1.5"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Expand Workspace</span>
              </button>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Floating Two-Piece Liquid Glass Bottom Navigation Bar (Mobile + Phone Frame View) */}
      <LiquidGlassNavBar
        items={mobileCapsuleItems}
        alertsBadge={computedTotals.totalAlertsCount}
        role={effectiveRole}
        mandalCode={mandal?.joinCode}
        phonePreviewOnDesktop={phonePreviewOnDesktop}
      />

      {/* Toast Notification with Optional 30-day Undo */}
      {toast && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] max-w-md">
          <div
            className={`rounded-2xl px-4 py-3 shadow-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              toast.tone === 'error'
                ? 'bg-[#DC2626] text-white border-[#B91C1C]'
                : toast.tone === 'info'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-[#2563EB] text-white border-[#1D4ED8]'
            }`}
          >
            <span className="leading-snug">{toast.message}</span>
            <div className="flex items-center gap-2 shrink-0">
              {toast.undoEntryId && (
                <button
                  type="button"
                  onClick={async () => {
                    await restoreEntry(toast.undoEntryId!);
                    dismissToast();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white text-slate-900 font-extrabold text-[11px] whitespace-nowrap"
                >
                  Undo
                </button>
              )}
              <button type="button" onClick={dismissToast} className="opacity-80 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
