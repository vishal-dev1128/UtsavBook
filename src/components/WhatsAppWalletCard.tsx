import { CheckCircle2, ChevronDown, ChevronUp, MessageCircle, Plus, Receipt, Trash2, Wallet } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useMandal } from '../context/MandalContext';
import { formatINR, formatReceiptDate } from '../lib/i18n';
import { getAvailableWhatsAppCredits } from '../types';
import { WhatsAppCreditPackModal } from './WhatsAppCreditPackModal';

interface WhatsAppWalletCardProps {
  onOpenPurchaseModal?: () => void;
}

export function WhatsAppWalletCard({ onOpenPurchaseModal }: WhatsAppWalletCardProps) {
  const {
    mandal,
    effectiveRole,
    entries,
    walletTransactions,
    creditTransactions,
    clearWalletHistory,
    showToast,
  } = useMandal();
  const [modalOpen, setModalOpen] = useState(false);
  const [showAllPacks, setShowAllPacks] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const totalReceiptsSent = useMemo(() => {
    const walletSentCount = walletTransactions.filter((tx) => tx.type === 'receipt_sent').length;
    if (walletSentCount > 0) return walletSentCount;
    return entries.filter(
      (e) =>
        !e.isVoided &&
        e.type === 'income' &&
        (e.whatsappStatus === 'sent' || e.whatsappStatus === 'delivered')
    ).length;
  }, [walletTransactions, entries]);

  const packPurchases = useMemo(() => {
    const seenRefs = new Set<string>();
    const combined: Array<{
      id: string;
      packName: string;
      creditsAdded: number;
      amountPaid: number;
      paymentRef: string;
      status: string;
      createdAt: string;
    }> = [];

    for (const tx of creditTransactions) {
      if (tx.payment_ref) seenRefs.add(tx.payment_ref);
      combined.push({
        id: tx.id,
        packName: tx.pack_name,
        creditsAdded: tx.credits_added,
        amountPaid: tx.amount_paid,
        paymentRef: tx.payment_ref,
        status: tx.status,
        createdAt: tx.created_at,
      });
    }

    for (const wtx of walletTransactions) {
      if (wtx.type !== 'pack_purchase') continue;
      if (wtx.razorpayPaymentId && seenRefs.has(wtx.razorpayPaymentId)) continue;
      combined.push({
        id: wtx.id,
        packName: wtx.packName || 'Credit Pack',
        creditsAdded: wtx.creditsDelta,
        amountPaid: wtx.amountInr,
        paymentRef: wtx.razorpayPaymentId || 'Verified',
        status: 'completed',
        createdAt: wtx.createdAt,
      });
    }

    return combined.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [creditTransactions, walletTransactions]);

  if (!mandal) return null;

  const isAdmin = effectiveRole === 'admin';
  const availableCredits = getAvailableWhatsAppCredits(mandal);
  const creditStatusStyle =
    availableCredits > 10
      ? 'text-emerald-600'
      : availableCredits > 0
        ? 'text-amber-600'
        : 'text-rose-600';

  const statusDotStyle =
    availableCredits > 10
      ? 'bg-emerald-500'
      : availableCredits > 0
        ? 'bg-amber-500'
        : 'bg-rose-500';

  const visiblePacks = showAllPacks ? packPurchases : packPurchases.slice(0, 3);
  const hasHistoryToClear = packPurchases.length > 0 || walletTransactions.length > 0;

  const handleOpenAddCredits = () => {
    if (onOpenPurchaseModal) {
      onOpenPurchaseModal();
    } else {
      setModalOpen(true);
    }
  };

  const handleClearPast = async (resetCreditsToTrial: boolean) => {
    if (clearing) return;
    setClearing(true);
    try {
      await clearWalletHistory(resetCreditsToTrial);
      setConfirmClear(false);
      setShowAllPacks(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to clear history', 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <section className="relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[20px] border border-slate-200/90 p-3.5 sm:p-4 space-y-3 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)]">
        {/* Subtle Top Highlight */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/55 to-transparent" />

        {/* Compact Single-Row Header */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 text-[#2563EB] flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-[15px] font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                WhatsApp Receipt Wallet
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 border border-blue-200/80 text-[#2563EB] shrink-0 leading-none">
                  {mandal.tierName} Tier
                </span>
                <span className="text-[11px] text-slate-500 truncate leading-none">
                  Donor receipt credits
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddCredits}
            className="h-9 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors duration-150 shrink-0 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Add Credits</span>
          </button>
        </div>

        {/* Compact Summary KPI Tiles */}
        <div className="grid grid-cols-2 gap-2.5 items-stretch">
          <div className="rounded-xl bg-[#F5F7FB] border border-slate-200/80 hover:border-blue-300/80 px-3 py-2.5 flex flex-col justify-between gap-1 transition-colors duration-150">
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11px] font-semibold text-slate-600 leading-tight whitespace-nowrap">
                <MessageCircle className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span>Available Credits</span>
              </span>
              <span className={`inline-flex rounded-full h-1.5 w-1.5 shrink-0 ${statusDotStyle}`} />
            </div>

            <div>
              <div className={`text-xl font-extrabold tabular-nums leading-tight ${creditStatusStyle}`}>
                {availableCredits}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">
                {availableCredits > 10
                  ? 'Ready to send'
                  : availableCredits > 0
                    ? 'Low — top up soon'
                    : '0 left — buy pack'}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#F5F7FB] border border-slate-200/80 hover:border-blue-300/80 px-3 py-2.5 flex flex-col justify-between gap-1 transition-colors duration-150">
            <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] font-semibold text-slate-600 leading-tight whitespace-nowrap">
              <Receipt className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span>Total Receipts Sent</span>
            </div>

            <div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums leading-tight">
                {totalReceiptsSent}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">
                WhatsApp sent
              </div>
            </div>
          </div>
        </div>

        {/* Past Pack Purchases */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Past Pack Purchases
              </h4>
              <span className="text-[11px] font-bold text-slate-400 tabular-nums shrink-0">
                ({packPurchases.length})
              </span>
            </div>

            {isAdmin && hasHistoryToClear && !confirmClear && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3 h-3 shrink-0" />
                <span>Clear Past</span>
              </button>
            )}
          </div>

          {confirmClear && (
            <div className="rounded-xl bg-rose-50/80 border border-rose-200 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-rose-900 leading-snug">
                Clear all past pack records?
              </span>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={clearing}
                  onClick={() => handleClearPast(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                >
                  {clearing ? 'Clearing...' : 'Clear History'}
                </button>
                {(availableCredits > 5 || mandal.tierName !== 'Free') && (
                  <button
                    type="button"
                    disabled={clearing}
                    onClick={() => handleClearPast(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    Clear &amp; Reset to 5 Free
                  </button>
                )}
                <button
                  type="button"
                  disabled={clearing}
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1.5 rounded-lg text-slate-600 hover:bg-white text-[11px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {packPurchases.length === 0 ? (
            <div className="rounded-xl bg-[#F5F7FB] border border-dashed border-slate-300/80 px-3 py-2.5 text-xs text-slate-500">
              No credit packs purchased yet. You start with 5 free trial credits.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
              <div className="divide-y divide-slate-100">
                {visiblePacks.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-blue-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {purchase.packName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight">
                          {formatReceiptDate(purchase.createdAt.slice(0, 10))} ·{' '}
                          <span className="font-mono">{purchase.paymentRef}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      <div className="text-xs font-extrabold text-[#2563EB] leading-tight">
                        +{purchase.creditsAdded} credits
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5 leading-tight">
                        {formatINR(purchase.amountPaid)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {packPurchases.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllPacks((prev) => !prev)}
                  className="w-full py-2 border-t border-slate-100 bg-[#F5F7FB]/70 hover:bg-blue-50/60 text-[11px] font-bold text-[#2563EB] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  {showAllPacks ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Show all {packPurchases.length} packs</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {!onOpenPurchaseModal && (
        <WhatsAppCreditPackModal open={modalOpen} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
