import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  MessageCircle,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  X,
  ZoomIn,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BillLightboxModal } from '../components/BillLightboxModal';
import { WhatsAppStatusBadge } from '../components/WhatsAppStatusBadge';
import { useMandal } from '../context/MandalContext';
import { formatINR, formatReceiptDate } from '../lib/i18n';
import { getAvailableWhatsAppCredits, LedgerEntry } from '../types';

export function AlertsPage() {
  const navigate = useNavigate();
  const {
    mandal,
    utsavEntries,
    handovers,
    effectiveRole,
    approvePendingExpense,
    rejectPendingExpense,
    approveCashHandover,
    resendWhatsAppReceipt,
    computedTotals,
    tr,
  } = useMandal();

  const [phoneEdits, setPhoneEdits] = useState<Record<string, string>>({});
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [zoomBillEntry, setZoomBillEntry] = useState<LedgerEntry | null>(null);

  if (!mandal) return null;

  const pendingExpenses = utsavEntries.filter(
    (e) => !e.isVoided && e.type === 'expense' && e.approvalStatus === 'pending'
  );
  const pendingHandovers = handovers.filter((h) => h.status === 'pending');
  const failedWhatsApps = utsavEntries.filter(
    (e) => !e.isVoided && e.type === 'income' && e.whatsappStatus === 'failed'
  );
  const availableCredits = getAvailableWhatsAppCredits(mandal);
  const lowCredits = availableCredits <= 10;
  const budgetAlerts = computedTotals.budgetAlerts;

  const isEmpty =
    pendingExpenses.length === 0 &&
    pendingHandovers.length === 0 &&
    failedWhatsApps.length === 0 &&
    budgetAlerts.length === 0 &&
    !lowCredits;

  const runAction = async (key: string, fn: () => unknown) => {
    if (busyMap[key]) return;
    setBusyMap((prev) => ({ ...prev, [key]: true }));
    try {
      await Promise.resolve(fn());
    } finally {
      setBusyMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F5F7FB] text-slate-900 overscroll-y-contain selection:bg-blue-500/15">
      {/* 120fps Compositor-Only Keyframes (transform + opacity only) */}
      <style>{`
        @keyframes alertsSlideUp {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0) scale(0.988);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes gentleFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -3px, 0);
          }
        }
        .animate-alert-in {
          will-change: transform, opacity;
          animation: alertsSlideUp 0.44s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-float-subtle {
          will-change: transform;
          animation: gentleFloat 3.2s ease-in-out infinite;
        }
      `}</style>

      {/* Sticky Liquid-Glass App Header */}
      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/75 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[18px] font-extrabold text-slate-900 tracking-tight leading-tight">
              {tr('alerts')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {computedTotals.totalAlertsCount === 1
                ? '1 pending item needing attention'
                : `${computedTotals.totalAlertsCount} pending items needing attention`}
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] shrink-0 ${
              computedTotals.totalAlertsCount > 0
                ? 'bg-amber-50/95 border-amber-200/90 text-amber-900'
                : 'bg-white/95 border-slate-200/90 text-slate-700'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {computedTotals.totalAlertsCount > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  computedTotals.totalAlertsCount > 0 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
              />
            </span>
            <span className="text-xs font-extrabold tabular-nums">
              {computedTotals.totalAlertsCount}
            </span>
            <span className="text-[11px] font-semibold opacity-75">pending</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 pt-3.5 pb-8 space-y-4">
        {isEmpty ? (
          <div
            style={{ animationDelay: '0ms' }}
            className="animate-alert-in relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 p-9 text-center space-y-3 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.06)]"
          >
            <div className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

            <div className="animate-float-subtle w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {tr('nothingPending')}
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                {tr('nothingPendingSub')}
              </p>
            </div>

            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/[0.08] border border-blue-500/20 text-[11px] font-bold text-blue-800">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>All approvals & receipts up to date</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 0. Category Budget Warnings & Exceeded Caps */}
            {budgetAlerts.length > 0 && (
              <section style={{ animationDelay: '0ms' }} className="animate-alert-in space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
                    Category Budget Warnings
                  </h2>
                  <span className="text-[11px] font-extrabold tabular-nums px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700">
                    {budgetAlerts.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {budgetAlerts.map((b, idx) => {
                    const isOver = b.level === 'exceeded';
                    const barWidth = Math.min(100, Math.max(6, b.pct));

                    return (
                      <div
                        key={b.head}
                        style={{ animationDelay: `${20 + idx * 40}ms` }}
                        className={`animate-alert-in relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[24px] border p-4 shadow-[0_6px_20px_-6px_rgba(16,24,40,0.06)] ${
                          isOver ? 'border-rose-300/90' : 'border-amber-300/90'
                        }`}
                      >
                        <div
                          className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                            isOver
                              ? 'from-rose-500 via-red-400 to-rose-500'
                              : 'from-amber-400 via-orange-400 to-amber-400'
                          }`}
                        />

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                                isOver
                                  ? 'bg-rose-50 border-rose-200/80 text-rose-600'
                                  : 'bg-amber-50 border-amber-200/80 text-amber-700'
                              }`}
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-extrabold text-slate-900 truncate">
                                  {b.head}
                                </span>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums ${
                                    isOver
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {b.pct}% {isOver ? 'Over Budget' : 'Warning'}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                                Spent{' '}
                                <strong className="text-slate-800">{formatINR(b.spent)}</strong> of{' '}
                                {formatINR(b.limit)} cap
                              </div>

                              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isOver ? 'bg-rose-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate('/expense')}
                            className="h-9 px-3.5 rounded-xl bg-[#F5F7FB] hover:bg-slate-100 active:scale-95 border border-slate-200/90 text-xs font-extrabold text-slate-800 shrink-0 transition-all touch-manipulation"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 1. Low WhatsApp Credit Warning */}
            {lowCredits && (
              <div
                style={{ animationDelay: '25ms' }}
                className="animate-alert-in relative overflow-hidden bg-white/95 backdrop-blur-xl border border-amber-300/90 rounded-[24px] p-4 shadow-[0_6px_20px_-6px_rgba(217,119,6,0.14)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />

                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-extrabold text-slate-900">
                          Low WhatsApp Credits
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 tabular-nums">
                          {availableCredits} left
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Top up a Starter, Utsav, or Mega Mandal pack so digital receipts keep
                        sending automatically.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/mandal/credits')}
                    className="h-9 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold shadow-xs shadow-amber-600/20 whitespace-nowrap shrink-0 transition-all touch-manipulation"
                  >
                    Buy Pack
                  </button>
                </div>
              </div>
            )}

            {/* 2. Pending Collector Expenses */}
            {pendingExpenses.length > 0 && (
              <section
                style={{ animationDelay: '50ms' }}
                className="animate-alert-in space-y-2.5"
              >
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
                    Collector Expenses Awaiting Approval
                  </h2>
                  <span className="text-[11px] font-extrabold tabular-nums px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800">
                    {pendingExpenses.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {pendingExpenses.map((exp, idx) => {
                    const isApproving = !!busyMap[`approve-${exp.id}`];
                    const isRejecting = !!busyMap[`reject-${exp.id}`];

                    return (
                      <div
                        key={exp.id}
                        style={{ animationDelay: `${70 + idx * 45}ms` }}
                        className="animate-alert-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 space-y-3.5 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                {exp.head}
                              </span>
                            </div>

                            <div className="text-sm font-extrabold text-slate-900 leading-snug">
                              {exp.titleOrDonorName}
                            </div>

                            <div className="text-[11px] text-slate-500">
                              By{' '}
                              <span className="font-semibold text-slate-700">
                                {exp.createdByName}
                              </span>{' '}
                              · {formatReceiptDate(exp.entryDate)}
                            </div>

                            {exp.flatOrAddress && (
                              <div className="text-[11px] text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg inline-block mt-0.5">
                                {exp.flatOrAddress}
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            <div className="text-base font-extrabold text-red-600 tabular-nums">
                              −{formatINR(exp.amount)}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-400">
                              {exp.paymentMode}
                            </div>
                          </div>
                        </div>

                        {exp.billPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => setZoomBillEntry(exp)}
                            className="w-full rounded-xl bg-[#F5F7FB] hover:bg-slate-100 active:scale-[0.99] border border-slate-200/90 p-2 flex items-center justify-between gap-3 text-left transition-all touch-manipulation"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={exp.billPhotoUrl}
                                alt="Expense bill"
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900">
                                  Attached Bill / Kacchi Parchi
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Tap to inspect full-screen before approving
                                </div>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 shrink-0 pr-1">
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>Zoom</span>
                            </span>
                          </button>
                        )}

                        {effectiveRole === 'admin' ? (
                          <div className="grid grid-cols-[1fr_auto] gap-2 pt-0.5">
                            <button
                              type="button"
                              disabled={isApproving || isRejecting}
                              onClick={() =>
                                runAction(`approve-${exp.id}`, () => approvePendingExpense(exp.id))
                              }
                              className="h-10 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white text-xs font-bold shadow-xs shadow-blue-600/20 inline-flex items-center justify-center gap-1.5 transition-all touch-manipulation"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>{isApproving ? 'Approving...' : 'Approve Expense'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isApproving || isRejecting}
                              onClick={() =>
                                runAction(`reject-${exp.id}`, () => rejectPendingExpense(exp.id))
                              }
                              className="h-10 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-[0.98] disabled:opacity-60 border border-rose-200/80 text-rose-700 text-xs font-bold inline-flex items-center justify-center gap-1 transition-all touch-manipulation"
                            >
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>{isRejecting ? '...' : 'Reject'}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F7FB] border border-slate-200/70 text-[11px] font-medium text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Waiting for Mandal Admin / Khajindar approval.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 3. Pending Cash Jama Handovers */}
            {pendingHandovers.length > 0 && (
              <section
                style={{ animationDelay: '100ms' }}
                className="animate-alert-in space-y-2.5"
              >
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
                    Cash Handover (Jama) Requests
                  </h2>
                  <span className="text-[11px] font-extrabold tabular-nums px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800">
                    {pendingHandovers.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {pendingHandovers.map((h, idx) => {
                    const isConfirming = !!busyMap[`jama-${h.id}`];

                    return (
                      <div
                        key={h.id}
                        style={{ animationDelay: `${120 + idx * 45}ms` }}
                        className="animate-alert-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 flex items-center justify-between gap-3 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.05)]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
                            <Wallet className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-sm font-extrabold text-slate-900 truncate">
                              <span className="truncate">{h.collectorName}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-600 shrink-0">Khajindar</span>
                            </div>
                            <div className="text-xs font-extrabold text-emerald-700 tabular-nums mt-0.5">
                              Cash Jama: {formatINR(h.amount)}
                            </div>
                          </div>
                        </div>

                        {effectiveRole === 'admin' ? (
                          <button
                            type="button"
                            disabled={isConfirming}
                            onClick={() =>
                              runAction(`jama-${h.id}`, () => approveCashHandover(h.id))
                            }
                            className="h-10 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white text-xs font-bold shadow-xs shadow-blue-600/20 whitespace-nowrap shrink-0 transition-all touch-manipulation"
                          >
                            {isConfirming ? 'Confirming...' : 'Confirm Jama'}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending Admin
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 4. Failed WhatsApp Receipts */}
            {failedWhatsApps.length > 0 && (
              <section
                style={{ animationDelay: '150ms' }}
                className="animate-alert-in space-y-2.5"
              >
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
                    Failed WhatsApp Receipts
                  </h2>
                  <span className="text-[11px] font-extrabold tabular-nums px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700">
                    {failedWhatsApps.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {failedWhatsApps.map((entry, idx) => {
                    const editedPhone = phoneEdits[entry.id] ?? entry.donorPhone ?? '';
                    const isResending = !!busyMap[`resend-${entry.id}`];

                    return (
                      <div
                        key={entry.id}
                        style={{ animationDelay: `${170 + idx * 45}ms` }}
                        className="animate-alert-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 space-y-3 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.05)]"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-extrabold text-slate-900 truncate">
                                  {entry.titleOrDonorName}
                                </span>
                                {entry.receiptNumber && (
                                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {entry.receiptNumber}
                                  </span>
                                )}
                                <WhatsAppStatusBadge
                                  status={entry.whatsappStatus}
                                  error={entry.whatsappError}
                                  compact
                                />
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                <span className="font-bold text-slate-700 tabular-nums">
                                  {formatINR(entry.amount)}
                                </span>{' '}
                                · {entry.whatsappError || 'Invalid or unreachable WhatsApp number'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 min-w-0">
                            <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="tel"
                              inputMode="numeric"
                              placeholder="10-digit WhatsApp number"
                              value={editedPhone}
                              onChange={(e) =>
                                setPhoneEdits((prev) => ({ ...prev, [entry.id]: e.target.value }))
                              }
                              className="w-full h-10 pl-8 pr-3 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all tabular-nums"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={isResending}
                            onClick={() =>
                              runAction(`resend-${entry.id}`, () =>
                                resendWhatsAppReceipt(entry.id, editedPhone)
                              )
                            }
                            className="h-10 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white text-xs font-bold shadow-xs shadow-blue-600/20 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all touch-manipulation"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{isResending ? 'Sending...' : 'Resend'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <BillLightboxModal
        imageUrl={zoomBillEntry?.billPhotoUrl || null}
        title={zoomBillEntry?.titleOrDonorName}
        subtitle={
          zoomBillEntry
            ? `${zoomBillEntry.head} · ${formatINR(zoomBillEntry.amount)} · By ${zoomBillEntry.createdByName}`
            : undefined
        }
        onClose={() => setZoomBillEntry(null)}
      />
    </div>
  );
}