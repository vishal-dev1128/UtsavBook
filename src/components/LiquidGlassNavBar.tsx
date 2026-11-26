import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Globe,
  List,
  Package,
  Plus,
} from 'lucide-react';
import React, { startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MemberRole } from '../types';

export interface LiquidNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const NavCapsuleIcon = React.memo(function NavCapsuleIcon({
  route,
  active,
  FallbackIcon,
}: {
  route: string;
  active: boolean;
  FallbackIcon: LucideIcon;
}) {
  const strokeWidth = active ? 2 : 1.85;

  if (route === '/home') {
    if (active) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px] shrink-0" aria-hidden="true">
          <path
            d="M3.75 10.6a2.3 2.3 0 0 1 .88-1.8l6-4.72a2.25 2.25 0 0 1 2.74 0l6 4.72a2.3 2.3 0 0 1 .88 1.8V18.2A2.55 2.55 0 0 1 17.7 20.75h-2.55a.75.75 0 0 1-.75-.75v-3.85a2.4 2.4 0 0 0-4.8 0V20a.75.75 0 0 1-.75.75H6.3A2.55 2.55 0 0 1 3.75 18.2v-7.6Z"
            fill="currentColor"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px] shrink-0" aria-hidden="true">
        <path
          d="M4 10.6a2.2 2.2 0 0 1 .85-1.74l5.8-4.56a2.2 2.2 0 0 1 2.7 0l5.8 4.56A2.2 2.2 0 0 1 20 10.6V18a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18v-7.4Z"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.6 20.5v-4.3a2.4 2.4 0 0 1 4.8 0v4.3"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (route === '/entries') {
    if (active) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px] shrink-0" aria-hidden="true">
          <rect x="3" y="4.5" width="15" height="11.5" rx="3" fill="currentColor" />
          <circle cx="10.5" cy="10.25" r="2.1" fill="#FFFFFF" />
          <circle cx="6.2" cy="8.2" r="0.85" fill="#FFFFFF" />
          <path
            d="M7 18.5h10.5A3.5 3.5 0 0 0 21 15V8.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px] shrink-0" aria-hidden="true">
        <rect
          x="3.25"
          y="4.75"
          width="14.5"
          height="11"
          rx="2.8"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <circle cx="10.5" cy="10.25" r="2" stroke="currentColor" strokeWidth="1.65" />
        <circle cx="6.35" cy="8.1" r="0.7" fill="currentColor" />
        <path
          d="M7 18.5h10.4a3.35 3.35 0 0 0 3.35-3.35V8.8"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (route === '/reports') {
    if (active) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px] shrink-0" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6.8 4.5h9.6A3.6 3.6 0 0 1 20 8.1v1.2h-3.6a2.7 2.7 0 0 0 0 5.4H20v1.2a3.6 3.6 0 0 1-3.6 3.6H6.8a3.6 3.6 0 0 1-3.6-3.6V8.1a3.6 3.6 0 0 1 3.6-3.6Zm9.6 6.2a1.3 1.3 0 1 0 0 2.6h4.1a1.3 1.3 0 1 0 0-2.6h-4.1Z"
            fill="currentColor"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px] shrink-0" aria-hidden="true">
        <rect
          x="3.5"
          y="4.75"
          width="16.25"
          height="14.5"
          rx="3.75"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <rect
          x="14.25"
          y="9.75"
          width="6.5"
          height="4.5"
          rx="2.25"
          fill="#FFFFFF"
          fillOpacity="0.92"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <circle cx="16.8" cy="12" r="0.85" fill="currentColor" />
      </svg>
    );
  }

  if (route === '/mandal') {
    if (active) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px] shrink-0" aria-hidden="true">
          <path
            d="M4.1 8.1a1 1 0 0 1 1.6-.46l3.05 2.44a1 1 0 0 0 1.48-.28l1.62-2.8a1 1 0 0 1 1.72 0l1.62 2.8a1 1 0 0 0 1.48.28l3.05-2.44a1 1 0 0 1 1.6.46l-1.1 7.1A2.5 2.5 0 0 1 17.75 17.3H6.25a2.5 2.5 0 0 1-2.47-2.1L4.1 8.1Z"
            fill="currentColor"
          />
          <rect x="6.5" y="19" width="11" height="2" rx="1" fill="currentColor" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px] shrink-0" aria-hidden="true">
        <path
          d="M4.3 8.4a.9.9 0 0 1 1.45-.42l3.08 2.46a1 1 0 0 0 1.47-.28l1.56-2.7a.9.9 0 0 1 1.56 0l1.56 2.7a1 1 0 0 0 1.47.28l3.08-2.46a.9.9 0 0 1 1.45.42l-1.08 6.85a2.4 2.4 0 0 1-2.37 2.02H7.75a2.4 2.4 0 0 1-2.37-2.02L4.3 8.4Z"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 19.75h9"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return <FallbackIcon className="w-[20px] h-[20px] shrink-0" strokeWidth={strokeWidth} />;
});

interface LiquidGlassNavBarProps {
  items: LiquidNavItem[];
  alertsBadge?: number;
  role?: MemberRole;
  mandalCode?: string;
  phonePreviewOnDesktop?: boolean;
}

export const LiquidGlassNavBar = React.memo(function LiquidGlassNavBar({
  items,
  alertsBadge = 0,
  role = 'admin',
  mandalCode,
  phonePreviewOnDesktop = false,
}: LiquidGlassNavBarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const pointerStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    dragging: boolean;
    trackLeft: number;
    trackWidth: number;
    lastHoverIdx: number;
  }>({
    pointerId: null,
    startX: 0,
    dragging: false,
    trackLeft: 0,
    trackWidth: 1,
    lastHoverIdx: -1,
  });

  const matchedIndex = items.findIndex(
    (item) =>
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`),
  );

  const safeMatchedIndex = matchedIndex >= 0 ? matchedIndex : 0;
  const highlightedIndex = dragHoverIndex ?? optimisticIndex ?? safeMatchedIndex;

  useEffect(() => {
    setOptimisticIndex(null);
    setQuickMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!quickMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [quickMenuOpen]);

  // Sync GPU transform whenever active slot changes (only when not actively finger-scrubbing)
  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (!pill || pointerStateRef.current.dragging) return;
    pill.style.transform = `translate3d(${highlightedIndex * 100}%, 0, 0)`;
  }, [highlightedIndex]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;

    pointerStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      dragging: false,
      trackLeft: rect.left,
      trackWidth: rect.width,
      lastHoverIdx: highlightedIndex,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = pointerStateRef.current;
    if (st.pointerId !== e.pointerId) return;

    if (!st.dragging && Math.abs(e.clientX - st.startX) > 6) {
      st.dragging = true;
      if (pillRef.current) {
        pillRef.current.style.transition = 'none';
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if capture is unsupported
      }
    }

    if (!st.dragging) return;

    const count = Math.max(1, items.length);
    const slotWidth = st.trackWidth / count;
    const rawOffset = (e.clientX - st.trackLeft) / slotWidth - 0.5;
    const clampedOffset = Math.max(0, Math.min(count - 1, rawOffset));

    if (pillRef.current) {
      pillRef.current.style.transform = `translate3d(${clampedOffset * 100}%, 0, 0) scale(1.03)`;
    }

    const nearestIdx = Math.max(
      0,
      Math.min(count - 1, Math.floor((e.clientX - st.trackLeft) / slotWidth)),
    );
    if (nearestIdx !== st.lastHoverIdx) {
      st.lastHoverIdx = nearestIdx;
      setDragHoverIndex(nearestIdx);
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = pointerStateRef.current;
    if (st.pointerId !== e.pointerId) return;

    const wasDragging = st.dragging;
    const count = Math.max(1, items.length);
    const slotWidth = st.trackWidth / count;
    const targetIdx = wasDragging
      ? Math.max(0, Math.min(count - 1, Math.floor((e.clientX - st.trackLeft) / slotWidth)))
      : highlightedIndex;

    pointerStateRef.current.pointerId = null;
    pointerStateRef.current.dragging = false;
    setDragHoverIndex(null);

    if (pillRef.current) {
      pillRef.current.style.transition = '';
      pillRef.current.style.transform = `translate3d(${targetIdx * 100}%, 0, 0)`;
    }

    if (wasDragging) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 60);

      const targetItem = items[targetIdx];
      if (targetItem) {
        setOptimisticIndex(targetIdx);
        if (targetItem.to !== location.pathname) {
          startTransition(() => {
            navigate(targetItem.to);
          });
        }
      }
    }
  };

  const handleSelectItem = (item: LiquidNavItem, idx: number) => {
    if (suppressClickRef.current) return;
    setOptimisticIndex(idx);
    setQuickMenuOpen(false);
    if (item.to !== location.pathname) {
      startTransition(() => {
        navigate(item.to);
      });
    }
  };

  const quickActions = useMemo(
    () =>
      role !== 'auditor'
        ? [
          {
            to: '/income',
            title: 'Add Income / Vargani',
            sub: 'Generate instant receipt',
            icon: ArrowUpRight,
            iconWrap: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
          },
          {
            to: '/expense',
            title: 'Add Expense / Javak',
            sub: 'Log bill or vendor payment',
            icon: ArrowDownRight,
            iconWrap: 'bg-red-50 text-red-600 border-red-200/80',
          },
          {
            to: '/goods',
            title: 'Add Goods / Vastu Daan',
            sub: 'Record in-kind donation',
            icon: Package,
            iconWrap: 'bg-amber-50 text-amber-700 border-amber-200/80',
          },
          {
            to: '/alerts',
            title: 'Alerts & Approvals',
            sub: alertsBadge > 0 ? `${alertsBadge} pending items` : 'All caught up',
            icon: Bell,
            badge: alertsBadge,
            iconWrap: 'bg-slate-100 text-slate-700 border-slate-200/80',
          },
        ]
        : [
          {
            to: '/alerts',
            title: 'Alerts & Approvals',
            sub: alertsBadge > 0 ? `${alertsBadge} pending items` : 'Audit notifications',
            icon: Bell,
            badge: alertsBadge,
            iconWrap: 'bg-blue-50 text-blue-600 border-blue-200/80',
          },
          {
            to: '/reports',
            title: 'Financial Reports',
            sub: 'Statements & PDF export',
            icon: BarChart3,
            iconWrap: 'bg-blue-50 text-blue-600 border-blue-200/80',
          },
          {
            to: '/entries',
            title: 'All Ledger Entries',
            sub: 'Inspect receipts & bills',
            icon: List,
            iconWrap: 'bg-slate-100 text-slate-700 border-slate-200/80',
          },
          {
            to: mandalCode ? `/m/${mandalCode}` : '/mandal',
            title: 'Public Transparency',
            sub: 'View live public portal',
            icon: Globe,
            iconWrap: 'bg-blue-50 text-blue-600 border-blue-200/80',
          },
        ],
    [role, alertsBadge, mandalCode],
  );

  const slotPercentWidth = `${100 / Math.max(1, items.length)}%`;

  return (
    <>
      {/* Premium Light Frosted Glass Backdrop (No Dark Tint) */}
      <div
        onClick={() => setQuickMenuOpen(false)}
        aria-hidden={!quickMenuOpen}
        className={`fixed inset-0 z-30 bg-white/15 backdrop-blur-[6px] backdrop-saturate-150 transition-opacity duration-300 ease-out ${quickMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
          } ${phonePreviewOnDesktop ? '' : 'md:hidden'}`}
      />

      <nav
        aria-label="Mobile Navigation"
        style={{ contain: 'layout style' }}
        className={`fixed bottom-3.5 left-0 right-0 z-40 px-3.5 pointer-events-none safe-bottom ${phonePreviewOnDesktop ? 'max-w-[430px] mx-auto' : 'md:hidden'
          }`}
      >
        <div className="relative mx-auto w-full max-w-[430px]">
          {/* Quick Actions Popover (Smooth Spring Entrance + Frosted Glass) */}
          <div
            aria-hidden={!quickMenuOpen}
            className={`absolute right-0 bottom-[72px] w-[268px] rounded-[26px] bg-white/88 backdrop-blur-2xl backdrop-saturate-150 border border-white/80 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.16),0_4px_16px_-2px_rgba(37,99,235,0.08)] p-2 space-y-1 origin-bottom-right will-change-transform transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1.2,0.36,1)] ${quickMenuOpen
                ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
              }`}
          >
            <div className="px-3 pt-1.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {role !== 'auditor' ? 'Quick Add & Actions' : 'Quick Jump'}
            </div>
            {quickActions.map((act, idx) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.to}
                  type="button"
                  style={{
                    transitionDelay: quickMenuOpen ? `${idx * 40}ms` : '0ms',
                  }}
                  onClick={() => {
                    setQuickMenuOpen(false);
                    startTransition(() => {
                      navigate(act.to);
                    });
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-2xl hover:bg-blue-50/80 active:scale-[0.98] text-left transition-[transform,opacity,background-color] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] touch-manipulation ${quickMenuOpen
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-2'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${act.iconWrap}`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        {act.title}
                      </div>
                      <div className="text-[10.5px] text-slate-500 truncate">{act.sub}</div>
                    </div>
                  </div>
                  {'badge' in act && act.badge !== undefined && act.badge > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#DC2626] text-white text-[10px] font-extrabold flex items-center justify-center tabular-nums shrink-0">
                      {act.badge > 99 ? '99+' : act.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pointer-events-auto flex items-center gap-2.5">
            {/* Left Frosted Liquid Glass Capsule (Icons Only) */}
            <div
              className="liquid-glass-bar flex-1 min-w-0 rounded-full p-[5px] select-none touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
            >
              <div ref={trackRef} className="relative grid grid-cols-4 h-[48px]">
                {/* Single Hardware-Accelerated Sliding White Liquid Pill — strong blue glow for active */}
                <div
                  ref={pillRef}
                  aria-hidden="true"
                  style={{
                    width: slotPercentWidth,
                    boxShadow:
                      '0 3px 18px -2px rgba(37,99,235,0.32), 0 1px 6px rgba(37,99,235,0.20), inset 0 1px 0 rgba(255,255,255,1)',
                  }}
                  className="liquid-glass-pill pointer-events-none absolute inset-y-0 left-0 rounded-full"
                />

                {items.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = idx === highlightedIndex;
                  const isCurrentRoute = idx === matchedIndex;
                  const showDotBadge =
                    item.to === '/mandal' && alertsBadge > 0 && !isActive;

                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => handleSelectItem(item, idx)}
                      aria-current={isCurrentRoute ? 'page' : undefined}
                      aria-label={item.label}
                      className={`relative z-10 flex flex-col items-center justify-center h-full min-w-0 px-1 rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 touch-manipulation gap-0.5 ${isActive ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <span className="relative inline-flex items-center justify-center shrink-0">
                        <NavCapsuleIcon
                          route={item.to}
                          active={isActive}
                          FallbackIcon={Icon}
                        />
                        {showDotBadge && (
                          <span
                            aria-label={`${alertsBadge} alerts`}
                            className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#DC2626] ring-2 ring-white/90"
                          />
                        )}
                      </span>
                      {/* Active dot indicator at bottom */}
                      <span
                        className={`w-1 h-1 rounded-full transition-all duration-200 ${isActive ? 'bg-[#2563EB] scale-100 opacity-100' : 'scale-0 opacity-0'
                          }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Floating Circular Blue '+' Action Button with Spring Animation */}
            <button
              type="button"
              aria-label={quickMenuOpen ? 'Close quick actions' : 'Open quick actions'}
              aria-expanded={quickMenuOpen}
              onClick={() => setQuickMenuOpen((prev) => !prev)}
              className={`relative w-[56px] h-[56px] shrink-0 rounded-full text-white flex items-center justify-center transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.9] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 touch-manipulation will-change-transform ${quickMenuOpen
                  ? 'bg-[#1D4ED8] scale-[1.05] ring-4 ring-blue-500/20 shadow-[0_14px_28px_-6px_rgba(37,99,235,0.55),0_4px_10px_rgba(37,99,235,0.3)]'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8] scale-100 shadow-[0_10px_24px_-6px_rgba(37,99,235,0.48),0_2px_6px_rgba(37,99,235,0.24)]'
                }`}
            >
              {/* Soft Expanding Aura Ring on Open */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 rounded-full border-2 border-blue-400/60 transition-[transform,opacity] duration-500 ease-out ${quickMenuOpen ? 'scale-125 opacity-0' : 'scale-95 opacity-0'
                  }`}
              />

              <span
                className={`inline-flex items-center justify-center will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${quickMenuOpen ? 'rotate-[135deg] scale-110' : 'rotate-0 scale-100'
                  }`}
              >
                <Plus className="w-[25px] h-[25px] stroke-[2.2]" />
              </span>

              {alertsBadge > 0 && !quickMenuOpen && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-extrabold flex items-center justify-center tabular-nums ring-2 ring-white shadow-sm">
                  {alertsBadge > 99 ? '99+' : alertsBadge}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
});