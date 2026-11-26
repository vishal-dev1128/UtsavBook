import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  MessageCircle,
  Package,
  Sparkles,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EntryDetailModal } from '../components/EntryModals';
import { WhatsAppStatusBadge } from '../components/WhatsAppStatusBadge';
import { useMandal } from '../context/MandalContext';
import { formatINR, formatReceiptDate } from '../lib/i18n';
import { shareReceiptWithImageOnWhatsApp } from '../lib/receiptService';
import { LedgerEntry, MANDAL_DEFAULT_EMBLEM, resolveMandalLogoUrl } from '../types';

// Grain texture matching the uploaded blue — fine noise over blue
const BLUE_GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.55'/%3E%3C/svg%3E")`;
/**
 * Smooth 60fps rolling number hook for balance & totals
 */
function useAnimatedNumber(target: number, duration = 650) {
  const [displayValue, setDisplayValue] = useState(target);
  const previousRef = useRef(target);

  useEffect(() => {
    const startValue = previousRef.current;
    const diff = target - startValue;
    if (diff === 0) return;

    let frameId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(startValue + diff * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousRef.current = target;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return displayValue;
}

export function HomePage() {
  const navigate = useNavigate();
  const {
    mandal,
    activeUtsav,
    utsavEntries,
    computedTotals,
    privacyMasked,
    setPrivacyMasked,
    effectiveRole,
    dataLoading,
    loadSampleData,
    language,
    sendAutomatedWhatsAppReceipt,
    showToast,
    tr,
  } = useMandal();

  const [loadingSample, setLoadingSample] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [sharingEntryId, setSharingEntryId] = useState<string | null>(null);

  const animatedBalance = useAnimatedNumber(computedTotals.balance);
  const animatedCollected = useAnimatedNumber(computedTotals.collected);
  const animatedSpent = useAnimatedNumber(computedTotals.spent);

  const recentEntries = useMemo(() => {
    return utsavEntries.filter((e) => !e.isVoided).slice(0, 10);
  }, [utsavEntries]);

  if (dataLoading || !mandal || !activeUtsav) {
    return (
      <div className="min-h-screen" style={{ background: '#F5F7FB' }}>
        <div
          className="bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#2563EB] pb-10 space-y-6 px-4 sm:px-6"
          style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/12 border border-white/20">
              <div className="w-7 h-7 rounded-full bg-white/95 p-0.5 shadow-sm flex items-center justify-center">
                <img
                  src="/logo-icon.png"
                  alt="UtsavBook"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="w-28 h-3.5 rounded-md bg-white/25 animate-pulse" />
            </div>
          </div>
          <div className="h-36 rounded-2xl bg-white/10 animate-pulse" />
        </div>
        <div className="p-4 sm:p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-slate-100 border border-slate-200/70 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const cleanIncomeLabel = tr('addIncome').replace(/^[+\-−]\s*/, '');
  const hasExceededBudget = computedTotals.budgetAlerts.some((b) => b.level === 'exceeded');

  const handleQuickShareEntry = async (entry: LedgerEntry) => {
    if (sharingEntryId || !mandal || !activeUtsav) return;
    setSharingEntryId(entry.id);
    try {
      const shareRes = await shareReceiptWithImageOnWhatsApp({
        mandal,
        utsavName: `${activeUtsav.name} (${activeUtsav.yearCycle})`,
        entry,
        language,
      });
      if (
        shareRes.status === 'shared_with_image' ||
        shareRes.status === 'downloaded_and_opened_wa'
      ) {
        if (shareRes.status === 'downloaded_and_opened_wa') {
          showToast('Receipt PNG saved & message copied! Attach the image in WhatsApp.', 'info');
        }
        void sendAutomatedWhatsAppReceipt(entry, undefined, language);
      }
    } finally {
      setSharingEntryId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-full bg-white text-slate-900 overscroll-y-contain selection:bg-blue-500/20">
      <style>{`
        @keyframes appFadeSlideUp {
          0% { opacity: 0; transform: translateY(14px) scale(0.988); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-card-in { animation: appFadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      {/* ===================================================================== */}
      {/* TOP FULL-BLEED BLUE GRAIN HERO — actual uploaded texture image        */}
      {/* ===================================================================== */}
      <div
        className="relative w-full text-white overflow-hidden"
        style={{
          /* Use the actual uploaded texture image — covers full hero area */
          backgroundImage: 'url(/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          /* Seamlessly extends into status bar / notch area */
          paddingTop: 'env(safe-area-inset-top, 0px)',
          /* Fallback color matches top of image */
          backgroundColor: '#1a2fc4',
        }}
      >
        {/* ── Layered overlays for depth & seamless top merge ── */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">

          {/* Top seamless merge: extends hero color into status bar notch area */}
          <div
            className="absolute top-0 left-0 right-0 h-16"
            style={{
              background:
                'linear-gradient(to bottom, rgba(26,47,196,0.35) 0%, transparent 100%)',
            }}
          />

          {/* Dark vignette blob — center-top (matches image's darker patch) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 65% 50% at 52% 28%, rgba(8,18,90,0.42) 0%, rgba(14,30,120,0.18) 45%, transparent 72%)',
            }}
          />

          {/* Bottom fade-to-canvas color — smooth merge into transactions */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[60%]"
            style={{
              background:
                'linear-gradient(to bottom, transparent 0%, rgba(246,249,255,0.08) 40%, rgba(246,249,255,0.55) 68%, rgba(246,249,255,0.92) 86%, #f6f9ff 100%)',
            }}
          />
        </div>

        {/* Top Navigation Bar — Centered Premium Mandal Crest */}
        <header className="relative z-30 px-4 sm:px-6 lg:px-8 pt-4 pb-2.5">
          <div className="relative w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => navigate('/mandal')}
              aria-label="Open Mandal Profile"
              className="inline-flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full bg-white/12 hover:bg-white/20 border border-white/24 backdrop-blur-md shadow-[0_8px_24px_-10px_rgba(8,18,90,0.55)] active:scale-[0.97] transition-all max-w-[calc(100%-1rem)] sm:max-w-md touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <img
                src={resolveMandalLogoUrl(mandal.logoUrl)}
                alt={mandal.name}
                onError={(e) => {
                  if (!e.currentTarget.src.endsWith(MANDAL_DEFAULT_EMBLEM)) {
                    e.currentTarget.src = MANDAL_DEFAULT_EMBLEM;
                  }
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover bg-white/95 ring-[1.5px] ring-white/55 shadow-sm shrink-0"
                referrerPolicy="no-referrer"
              />
              <span className="text-[13px] sm:text-sm font-extrabold text-white tracking-[0.04em] truncate leading-none">
                {mandal.name}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/m/${mandal.joinCode}`)}
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/12 hover:bg-white/22 border border-white/20 text-[11px] font-bold text-white backdrop-blur-md transition-all active:scale-95 whitespace-nowrap absolute right-0"
            >
              <Globe className="w-3.5 h-3.5 text-blue-100" />
              <span>Public View</span>
            </button>
          </div>
        </header>

        {/* Hero Content Inside the Blue Textured Section */}
        <div className="relative z-20 w-full px-4 sm:px-6 lg:px-8 pt-2 pb-24 sm:pb-28 space-y-5">

          {/* Budget Alert Banner (if triggered) */}
          {computedTotals.budgetAlerts.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/expense')}
              style={{ animationDelay: '0ms' }}
              className={`animate-card-in w-full rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.995] backdrop-blur-md ${
                hasExceededBudget
                  ? 'bg-rose-500/25 border-rose-200/40 text-white hover:bg-rose-500/35'
                  : 'bg-amber-400/25 border-amber-200/40 text-white hover:bg-amber-400/35'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold truncate">
                    {hasExceededBudget ? 'Budget Limit Exceeded' : 'Category Budget Alert'}
                  </div>
                  <div className="text-[11px] text-blue-100 truncate">
                    {computedTotals.budgetAlerts[0].head} at {computedTotals.budgetAlerts[0].pct}%
                    {computedTotals.budgetAlerts.length > 1
                      ? ` (+${computedTotals.budgetAlerts.length - 1} more)`
                      : ''}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 text-white/80" />
            </button>
          )}

          {/* Minimal Razorpay-Style Treasury Balance Showcase */}
          <section
            style={{ animationDelay: '30ms' }}
            className="animate-card-in max-w-2xl mx-auto text-center space-y-4 pt-1"
          >
            {/* Clean Label + Subtle Icon-Only Privacy Toggle */}
            <div className="inline-flex items-center justify-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-100/90">
                {tr('netBalance')}
              </span>
              <button
                type="button"
                aria-label={privacyMasked ? 'Show balances' : 'Hide balances'}
                onClick={() => setPrivacyMasked((prev) => !prev)}
                className="w-6 h-6 rounded-full bg-white/12 hover:bg-white/25 text-white/90 inline-flex items-center justify-center active:scale-90 transition-all touch-manipulation"
              >
                {privacyMasked ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Big Crisp White Balance Number */}
            <div className="text-[40px] sm:text-[50px] font-extrabold tracking-tight text-white tabular-nums leading-none drop-shadow-xs">
              {formatINR(animatedBalance, privacyMasked)}
            </div>

            {/* Subtle Luminous Hairline Divider */}
            <div
              aria-hidden="true"
              className="h-px w-full max-w-md mx-auto bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />

            {/* Collected & Spent Breakdown Directly on Blue Canvas */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto pt-1">
              <button
                type="button"
                onClick={() => navigate('/entries?type=income')}
                className="group rounded-2xl bg-white/10 hover:bg-white/18 active:bg-white/22 border border-white/18 backdrop-blur-md px-3.5 py-2.5 text-left transition-all flex items-center justify-between gap-2 min-w-0 touch-manipulation"
              >
                <div className="min-w-0">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-100/85 whitespace-nowrap">
                    {tr('collected')}
                  </span>
                  <span className="block text-[15px] sm:text-lg font-extrabold text-white tabular-nums mt-0.5 truncate">
                    {formatINR(animatedCollected, privacyMasked)}
                  </span>
                </div>
                <span className="w-7 h-7 rounded-xl bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/entries?type=expense')}
                className="group rounded-2xl bg-white/10 hover:bg-white/18 active:bg-white/22 border border-white/18 backdrop-blur-md px-3.5 py-2.5 text-left transition-all flex items-center justify-between gap-2 min-w-0 touch-manipulation"
              >
                <div className="min-w-0">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-100/85 whitespace-nowrap">
                    {tr('spent')}
                  </span>
                  <span className="block text-[15px] sm:text-lg font-extrabold text-white tabular-nums mt-0.5 truncate">
                    {formatINR(animatedSpent, privacyMasked)}
                  </span>
                </div>
                <span className="w-7 h-7 rounded-xl bg-rose-400/20 border border-rose-300/30 text-rose-200 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          </section>
        </div>

        {/* fade-to-white already handled inside the hero overlay div above */}
      </div>

      {/* ===================================================================== */}
      {/* BOTTOM SEAMLESS WHITE CANVAS (RECENT TRANSACTIONS LEDGER)             */}
      {/* ===================================================================== */}
      <main
        className="relative z-20 -mt-8 sm:-mt-10 flex-1 w-full px-4 sm:px-6 lg:px-8 pt-2 pb-10 lg:pb-14"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0px, #f6f9ff 34px, #fbfdff 140px, #ffffff 280px)',
        }}
      >
        {/* RECENT TRANSACTIONS LEDGER */}
        <section style={{ animationDelay: '90ms' }} className="animate-card-in space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
              {tr('recentTransactions')}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/entries')}
              className="h-8 px-3 rounded-full bg-white/80 hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 text-xs font-extrabold text-blue-700 inline-flex items-center gap-1 backdrop-blur-sm active:scale-95 transition-all"
            >
              <span>{tr('viewAll')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-[24px] border border-slate-200/85 divide-y divide-slate-100 overflow-hidden shadow-[0_8px_24px_-12px_rgba(15,23,42,0.06)]">
            {recentEntries.length === 0 ? (
              <div className="p-10 text-center space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  No transactions yet. Tap{' '}
                  <span className="font-bold text-blue-700">+ {cleanIncomeLabel}</span> to add an
                  entry.
                </p>
                {effectiveRole === 'admin' && (
                  <button
                    type="button"
                    disabled={loadingSample}
                    onClick={async () => {
                      setLoadingSample(true);
                      try {
                        await loadSampleData();
                      } finally {
                        setLoadingSample(false);
                      }
                    }}
                    className="h-10 px-4 rounded-xl bg-blue-50 border border-blue-200/80 text-xs font-extrabold text-blue-900 hover:bg-blue-100/80 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {loadingSample ? 'Loading...' : 'Load sample data'}
                  </button>
                )}
              </div>
            ) : (
              recentEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  role="button"
                  tabIndex={0}
                  style={{ animationDelay: `${120 + idx * 30}ms` }}
                  onClick={() => setSelectedEntry(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedEntry(entry);
                    }
                  }}
                  className="animate-card-in w-full px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col gap-2 text-left hover:bg-slate-50/90 active:bg-slate-100/80 transition-colors min-h-[68px] touch-manipulation group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                          entry.type === 'income'
                            ? 'bg-emerald-50 border-emerald-200/80 text-emerald-600'
                            : entry.type === 'expense'
                            ? 'bg-red-50 border-red-200/80 text-red-600'
                            : 'bg-amber-50 border-amber-200/80 text-amber-700'
                        }`}
                      >
                        {entry.type === 'income' ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : entry.type === 'expense' ? (
                          <ArrowDownRight className="w-5 h-5" />
                        ) : (
                          <Package className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-extrabold text-slate-900 truncate">
                            {entry.titleOrDonorName}
                          </span>
                          {entry.isAnonymous && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                              Gupt
                            </span>
                          )}
                          {entry.billPhotoUrl && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200/80 text-rose-700 shrink-0">
                              <Camera className="w-2.5 h-2.5" />
                              Bill
                            </span>
                          )}
                          {entry.approvalStatus === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                          {entry.flatOrAddress || entry.head} ·{' '}
                          <span className="font-semibold text-slate-700">{entry.paymentMode}</span>
                          {entry.upiTransactionId ? ` · UTR ${entry.upiTransactionId.slice(-6)}` : ''} ·{' '}
                          {formatReceiptDate(entry.entryDate)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {entry.type === 'goods' ? (
                        <span className="inline-block text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80">
                          Goods
                        </span>
                      ) : (
                        <div
                          className={`text-sm sm:text-base font-extrabold tabular-nums ${
                            entry.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {entry.type === 'income' ? '+' : '−'}
                          {formatINR(entry.amount, privacyMasked)}
                        </div>
                      )}
                    </div>
                  </div>

                  {(entry.receiptNumber || entry.type === 'income') && (
                    <div className="pl-[56px] sm:pl-[58px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {entry.receiptNumber && (
                          <span className="text-[10.5px] font-mono text-slate-400 truncate">
                            {entry.receiptNumber}
                          </span>
                        )}
                        {entry.type === 'income' && (
                          <WhatsAppStatusBadge
                            status={entry.whatsappStatus}
                            error={entry.whatsappError}
                            compact
                          />
                        )}
                      </div>
                      {entry.type === 'income' && (
                        <button
                          type="button"
                          disabled={sharingEntryId === entry.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleQuickShareEntry(entry);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200/90 text-blue-700 text-[10.5px] font-bold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                        >
                          <MessageCircle className="w-3 h-3 shrink-0" />
                          {sharingEntryId === entry.id ? (
                            <span>Sharing...</span>
                          ) : (
                            <>
                              <span className="sm:hidden">Share</span>
                              <span className="hidden sm:inline">Share on WhatsApp</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Official UtsavBook Brand Footer */}
        <footer className="pt-6 pb-2 flex flex-col items-center justify-center gap-1.5 opacity-80">
          <div className="inline-flex items-center gap-2">
            <img
              src="/logo-icon.png"
              alt="UtsavBook"
              className="w-6 h-6 rounded-lg object-contain mix-blend-multiply"
            />
            <img
              src="/logo-text.png"
              alt="UtsavBook"
              className="h-3.5 w-auto object-contain"
            />
          </div>
          <span className="text-[10.5px] font-semibold text-slate-400 tracking-wide">
            {tr('tagline')}
          </span>
        </footer>
      </main>

      <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}