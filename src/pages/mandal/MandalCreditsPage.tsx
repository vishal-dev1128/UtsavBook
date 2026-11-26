import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { WhatsAppCreditPackModal } from '../../components/WhatsAppCreditPackModal';
import { WhatsAppWalletCard } from '../../components/WhatsAppWalletCard';
import { useMandal } from '../../context/MandalContext';
import { formatINR, formatReceiptDate } from '../../lib/i18n';
import { RECEIPT_PACKS } from '../../types';
import { MandalSubPageShell } from './MandalSubPageShell';

type ActivityFilter = 'all' | 'added' | 'used';

function formatSafeTxDate(raw?: string | number | Date): string {
  if (!raw) return '—';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    if (typeof raw === 'string' && raw.length >= 10) {
      return formatReceiptDate(raw.slice(0, 10));
    }
    return '—';
  }
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return formatReceiptDate(`${yyyy}-${mm}-${dd}`);
}

function formatTxTitle(packName?: string, type?: string): string {
  if (packName && packName.trim()) return packName.trim();
  if (!type) return 'Wallet Activity';
  return type
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function MandalCreditsPage() {
  const { mandal, effectiveRole, walletTransactions = [] } = useMandal();

  const defaultPackId = useMemo(
    () =>
      RECEIPT_PACKS.find((p) => p.badge === 'Most Popular')?.id ??
      RECEIPT_PACKS[0]?.id ??
      'pack_utsav_300',
    [],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string>(defaultPackId);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  const isAdmin = effectiveRole === 'admin';

  const sortedTransactions = useMemo(
    () =>
      [...walletTransactions].sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return (Number.isNaN(tB) ? 0 : tB) - (Number.isNaN(tA) ? 0 : tA);
      }),
    [walletTransactions],
  );

  const filteredTransactions = useMemo(() => {
    if (activityFilter === 'added') {
      return sortedTransactions.filter((tx) => tx.creditsDelta > 0);
    }
    if (activityFilter === 'used') {
      return sortedTransactions.filter((tx) => tx.creditsDelta < 0);
    }
    return sortedTransactions;
  }, [sortedTransactions, activityFilter]);

  if (!mandal) return null;

  const visibleActivity = showAllActivity
    ? filteredTransactions
    : filteredTransactions.slice(0, 5);

  const openModalWithPack = (packId: string) => {
    if (!isAdmin) return;
    setSelectedPackId(packId);
    setModalOpen(true);
  };

  return (
    <MandalSubPageShell
      title="WhatsApp Receipt Wallet"
      subtitle="Prepaid receipt credits, packs & recharge history"
    >
      <div className="space-y-4 pb-24">
        {/* Section 1: Compact Summary Card + Past Pack Purchases */}
        <div style={{ animationDelay: '0ms' }} className="animate-page-in">
          <WhatsAppWalletCard
            onOpenPurchaseModal={() => openModalWithPack(defaultPackId)}
          />
        </div>

        {/* Section 2: Compact 3 Aligned Pack Cards */}
        <section style={{ animationDelay: '45ms' }} className="animate-page-in space-y-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Choose a Credit Pack
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              Credits never expire
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
            {RECEIPT_PACKS.map((pack, idx) => {
              const isPopular = pack.badge === 'Most Popular';
              const isBestValue = pack.badge === 'Best Value';

              return (
                <div
                  key={pack.id}
                  style={{ animationDelay: `${65 + idx * 35}ms` }}
                  className={`animate-page-in relative overflow-hidden rounded-[20px] p-3.5 h-full flex flex-col justify-between gap-3 transition-all duration-150 border ${
                    isPopular
                      ? 'bg-gradient-to-b from-blue-50/75 via-white to-white border-[#2563EB] shadow-[0_4px_16px_-8px_rgba(15,23,42,0.08)]'
                      : 'bg-white/95 backdrop-blur-xl border-slate-200/90 hover:border-blue-300 shadow-[0_4px_14px_-8px_rgba(15,23,42,0.05)]'
                  }`}
                >
                  {isPopular && (
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/70 to-transparent" />
                  )}

                  <div className="space-y-2">
                    {/* Pack Name + Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-[13px] font-extrabold text-slate-900 leading-snug">
                        {pack.name}
                      </span>
                      {pack.badge && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 leading-none ${
                            isPopular
                              ? 'bg-[#2563EB] text-white'
                              : isBestValue
                                ? 'bg-[#10B981] text-white'
                                : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5 shrink-0" />
                          <span>{pack.badge}</span>
                        </span>
                      )}
                    </div>

                    {/* Price & Volume */}
                    <div>
                      <div className="flex items-baseline gap-1.5 tabular-nums">
                        <span className="text-xl font-extrabold text-slate-900 leading-none">
                          {formatINR(pack.priceInr)}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          / {pack.credits} receipts
                        </span>
                      </div>
                      <div
                        className={`text-[11px] mt-1 tabular-nums leading-tight ${
                          pack.perReceiptCost.includes('Save')
                            ? 'font-bold text-emerald-600'
                            : 'font-medium text-slate-500'
                        }`}
                      >
                        {pack.perReceiptCost}
                      </div>
                    </div>
                  </div>

                  {/* Aligned CTA Button */}
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => openModalWithPack(pack.id)}
                    className={`w-full h-9 px-3 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
                      !isAdmin
                        ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                        : isPopular
                          ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer active:scale-[0.98]'
                          : 'bg-blue-50 hover:bg-[#2563EB] border border-blue-200/90 text-blue-700 hover:text-white hover:border-[#2563EB] cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    {isAdmin ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Buy {formatINR(pack.priceInr)}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Admin Only</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Compact Credit Activity Log */}
        <section
          style={{ animationDelay: '140ms' }}
          className="animate-page-in relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[20px] border border-slate-200/90 p-3.5 sm:p-4 space-y-2.5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)]"
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/45 to-transparent" />
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Full Credit Activity Log
            </h3>
            <span className="text-[11px] font-bold text-slate-400 tabular-nums">
              {filteredTransactions.length}{' '}
              {filteredTransactions.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {sortedTransactions.length > 0 && (
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'added', label: 'Added' },
                  { id: 'used', label: 'Used' },
                ] as const
              ).map((tab) => {
                const active = activityFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActivityFilter(tab.id);
                      setShowAllActivity(false);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#F5F7FB] text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {filteredTransactions.length === 0 ? (
            <div className="rounded-xl bg-[#F5F7FB] border border-dashed border-slate-300/80 px-3 py-2.5 text-xs text-slate-500">
              {sortedTransactions.length === 0
                ? 'No wallet activity yet.'
                : 'No matching credit transactions for this filter.'}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
              <div className="divide-y divide-slate-100">
                {visibleActivity.map((tx) => {
                  const isCreditAdd = tx.creditsDelta > 0;
                  const absCredits = Math.abs(tx.creditsDelta);
                  const creditUnit = absCredits === 1 ? 'credit' : 'credits';

                  return (
                    <div
                      key={tx.id}
                      className="px-3 py-2.5 flex items-center justify-between gap-2.5 text-xs hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                            isCreditAdd
                              ? 'bg-blue-50 border-blue-200/70 text-[#2563EB]'
                              : 'bg-rose-50 border-rose-200/70 text-rose-600'
                          }`}
                        >
                          {isCreditAdd ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 truncate leading-tight">
                            {formatTxTitle(tx.packName, tx.type)}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-tight truncate">
                            {formatSafeTxDate(tx.createdAt)}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`font-bold tabular-nums px-2 py-0.5 rounded-full text-[11px] shrink-0 ${
                          isCreditAdd
                            ? 'bg-blue-50 border border-blue-200/70 text-[#2563EB]'
                            : 'bg-rose-50 border border-rose-200/70 text-rose-700'
                        }`}
                      >
                        {isCreditAdd
                          ? `+${tx.creditsDelta} ${creditUnit}`
                          : `${tx.creditsDelta} ${creditUnit}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {filteredTransactions.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllActivity((prev) => !prev)}
                  className="w-full py-2 border-t border-slate-100 bg-[#F5F7FB]/70 hover:bg-blue-50/60 text-[11px] font-bold text-[#2563EB] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  {showAllActivity ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Show all {filteredTransactions.length} entries</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <WhatsAppCreditPackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialPackId={selectedPackId}
      />
    </MandalSubPageShell>
  );
}