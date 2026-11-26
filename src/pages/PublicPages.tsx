import { doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  EyeOff,
  FileX2,
  Package,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { OrnateReceipt } from '../components/DigitalReceiptCard';
import { useMandal } from '../context/MandalContext';
import { db } from '../lib/firebase';
import { formatINR, formatReceiptDate } from '../lib/i18n';
import {
  MANDAL_DEFAULT_EMBLEM,
  PublicMandalSnapshot,
  PublicReceipt,
  resolveMandalLogoUrl,
} from '../types';

const SPEND_CHART_COLORS = ['#E11D48', '#D97706', '#2563EB', '#0EA5E9', '#7C3AED', '#4F46E5'];

const PUBLIC_ANIMATION_STYLES = (
  <style>{`
    @keyframes publicCardReveal {
      0% { opacity: 0; transform: translate3d(0, 12px, 0) scale(0.988); }
      100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
    }
    @keyframes publicOrbFloat {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.65; }
      50% { transform: translate3d(-8px, 6px, 0) scale(1.08); opacity: 0.95; }
    }
    .animate-public-in { will-change: transform, opacity; animation: publicCardReveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .animate-public-orb { will-change: transform, opacity; animation: publicOrbFloat 7.5s ease-in-out infinite; }
  `}</style>
);

export function PublicVerifyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, mandal, activeUtsav, entries } = useMandal();
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) {
        if (active) {
          setReceipt(null);
          setLoading(false);
        }
        return;
      }

      if (active) setLoading(true);

      const localMatch = entries.find((e) => e.publicReceiptId === id || e.id === id);
      if (localMatch && mandal && localMatch.user_id === mandal.user_id) {
        if (active) {
          setReceipt({
            publicReceiptId: id,
            user_id: mandal.user_id,
            mandalId: mandal.id,
            mandalName: mandal.name,
            mandalAddress: mandal.address,
            estYear: mandal.estYear,
            logoUrl: mandal.logoUrl,
            utsavName: activeUtsav?.name || 'Ganeshotsav',
            receiptNumber: localMatch.receiptNumber || 'MB-1-0001',
            donorName: localMatch.titleOrDonorName,
            flatOrAddress: localMatch.flatOrAddress,
            amount: localMatch.amount,
            paymentMode: localMatch.paymentMode,
            upiTransactionId: localMatch.upiTransactionId,
            isAnonymous: localMatch.isAnonymous,
            date: localMatch.entryDate,
            receiptImageUrl: localMatch.receiptImageUrl,
            isVerified: mandal.isVerified,
            isVoided: localMatch.isVoided,
          });
          setLoading(false);
        }
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'public_receipts', id));
        if (active) {
          setReceipt(snap.exists() ? (snap.data() as PublicReceipt) : null);
        }
      } catch {
        if (active) setReceipt(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id, entries, mandal, activeUtsav]);

  return (
    <div className="min-h-[100dvh] bg-[#F5F7FB] text-slate-900 flex flex-col pb-[env(safe-area-inset-bottom)] overscroll-y-contain selection:bg-blue-500/15">
      {PUBLIC_ANIMATION_STYLES}

      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(user ? '/home' : '/login')}
            className="h-9 px-3 rounded-2xl bg-white/95 hover:bg-slate-50 active:scale-95 border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(16,24,40,0.05)] text-xs font-bold text-slate-800 inline-flex items-center gap-1.5 transition-all touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>{user ? 'UtsavBook' : 'Sign In'}</span>
          </button>

          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-800 bg-blue-50/95 border border-blue-200/80 px-3 py-1.5 rounded-full shadow-[0_2px_8px_-2px_rgba(5,150,105,0.12)]">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Public Verification</span>
          </span>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-4 pb-10 space-y-4">
        {loading ? (
          <div className="rounded-[28px] bg-white/95 backdrop-blur-xl border border-slate-200/90 p-6 space-y-4 shadow-[0_8px_24px_-8px_rgba(16,24,40,0.06)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-200/70 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-40 rounded-lg bg-slate-200/70 animate-pulse" />
                <div className="h-3 w-28 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            </div>
            <div className="h-64 rounded-2xl bg-slate-100/80 animate-pulse" />
          </div>
        ) : !receipt ? (
          <div
            style={{ animationDelay: '0ms' }}
            className="animate-public-in bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 p-9 text-center space-y-3 shadow-[0_8px_24px_-8px_rgba(16,24,40,0.06)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto">
              <FileX2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-extrabold text-slate-900">Receipt Not Found</h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                This receipt ID could not be verified. Please check the QR code or contact the
                Mandal treasurer.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div
              style={{ animationDelay: '0ms' }}
              className={`animate-public-in rounded-[24px] bg-white/95 backdrop-blur-xl border p-4 flex items-center gap-3 shadow-[0_6px_20px_-6px_rgba(16,24,40,0.06)] ${
                receipt.isVoided ? 'border-rose-200/90' : 'border-blue-200/90'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                  receipt.isVoided
                    ? 'bg-rose-50 border-rose-200/80 text-rose-600'
                    : 'bg-blue-50 border-blue-200/80 text-blue-600'
                }`}
              >
                {receipt.isVoided ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <strong className="text-sm font-extrabold text-slate-900">
                    {receipt.isVoided
                      ? 'Receipt Cancelled / Voided'
                      : 'Authentic UtsavBook Receipt'}
                  </strong>
                </div>
                <div className="text-slate-500 mt-0.5 truncate">
                  Issued by <span className="font-semibold text-slate-700">{receipt.mandalName}</span>{' '}
                  · <span className="font-mono font-semibold">{receipt.receiptNumber}</span>
                </div>
              </div>
            </div>

            <div style={{ animationDelay: '65ms' }} className="animate-public-in">
              <OrnateReceipt
                mandal={{
                  id: receipt.mandalId,
                  user_id: receipt.user_id,
                  name: receipt.mandalName,
                  address: receipt.mandalAddress,
                  estYear: receipt.estYear || '2026',
                  logoUrl: resolveMandalLogoUrl(receipt.logoUrl),
                  receiptPrefix: 'MB-1',
                  joinCode: 'PUBLIC',
                  tierName: 'Free',
                  whatsappCredits: 0,
                  whatsapp_credits: 0,
                  isVerified: Boolean(receipt.isVerified),
                  showDonorsPublic: true,
                  ownerId: receipt.user_id,
                  createdAt: '',
                  updatedAt: '',
                }}
                utsavName={receipt.utsavName}
                showActions={false}
                entry={{
                  id: receipt.publicReceiptId,
                  user_id: receipt.user_id,
                  utsavId: '',
                  type: receipt.paymentMode === 'GOODS' ? 'goods' : 'income',
                  receiptNumber: receipt.receiptNumber,
                  publicReceiptId: receipt.publicReceiptId,
                  titleOrDonorName: receipt.donorName,
                  flatOrAddress: receipt.flatOrAddress,
                  head: 'Vargani / Chanda',
                  amount: receipt.amount,
                  paymentMode: receipt.paymentMode as 'UPI' | 'CASH' | 'BANK' | 'GOODS',
                  upiTransactionId: receipt.upiTransactionId,
                  isAnonymous: receipt.isAnonymous,
                  whatsappStatus: 'delivered',
                  approvalStatus: 'approved',
                  createdByUid: receipt.user_id,
                  createdByName: 'Mandal Committee',
                  isVoided: receipt.isVoided,
                  entryDate: receipt.date,
                  createdAt: receipt.date,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-400">
          <span>Verified via</span>
          <img
            src="/logo-icon.png"
            alt=""
            className="w-4 h-4 rounded-sm object-contain mix-blend-multiply"
          />
          <img src="/logo-text.png" alt="UtsavBook" className="h-3 w-auto object-contain" />
          <span>· Digital Community Ledger</span>
        </div>
      </main>
    </div>
  );
}

export function PublicTransparencyPage() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, mandal, activeUtsav, utsavEntries, computedTotals } = useMandal();
  const [snapshot, setSnapshot] = useState<PublicMandalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookupCode, setLookupCode] = useState('');

  const resolvedCode = (code || searchParams.get('code') || mandal?.joinCode || '').trim().toUpperCase();

  useEffect(() => {
    let active = true;
    async function load() {
      if (!resolvedCode) {
        if (active) {
          setSnapshot(null);
          setLoading(false);
        }
        return;
      }

      if (active) setLoading(true);

      if (mandal && mandal.joinCode.toUpperCase() === resolvedCode && activeUtsav) {
        const activeList = utsavEntries.filter(
          (e) => !e.isVoided && e.approvalStatus === 'approved'
        );
        const catMap = new Map<string, number>();
        for (const e of activeList.filter((x) => x.type === 'expense')) {
          catMap.set(e.head, (catMap.get(e.head) || 0) + e.amount);
        }
        if (active) {
          setSnapshot({
            joinCode: mandal.joinCode,
            user_id: mandal.user_id,
            mandalId: mandal.id,
            mandalName: mandal.name,
            address: mandal.address,
            estYear: mandal.estYear,
            isVerified: mandal.isVerified,
            utsavName: activeUtsav.name,
            yearCycle: activeUtsav.yearCycle,
            totalCollected: computedTotals.collected,
            totalSpent: computedTotals.spent,
            showDonorsPublic: mandal.showDonorsPublic,
            categoryBreakdown: Array.from(catMap.entries())
              .map(([head, total]) => ({ head, total }))
              .sort((a, b) => b.total - a.total),
            publicDonors: mandal.showDonorsPublic
              ? activeList
                  .filter((x) => x.type === 'income')
                  .map((d) => ({
                    donorName: d.isAnonymous ? 'Gupt Daan / Anonymous' : d.titleOrDonorName,
                    flatOrAddress: d.isAnonymous ? undefined : d.flatOrAddress,
                    amount: d.amount,
                    entryDate: d.entryDate,
                    receiptNumber: d.receiptNumber,
                  }))
              : [],
            publicGoods: mandal.showDonorsPublic
              ? activeList
                  .filter((x) => x.type === 'goods')
                  .map((g) => ({
                    donorName: g.isAnonymous ? 'Gupt Daan / Anonymous' : g.titleOrDonorName,
                    flatOrAddress: g.isAnonymous ? undefined : g.flatOrAddress,
                    goodsDescription: g.goodsDescription,
                    head: g.head,
                    estimatedValue: g.estimatedValue,
                    quantity: g.quantity,
                    entryDate: g.entryDate,
                    isAnonymous: Boolean(g.isAnonymous),
                  }))
              : [],
            updatedAt: new Date().toISOString(),
          });
          setLoading(false);
        }
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'public_mandals', resolvedCode));
        if (active) {
          setSnapshot(snap.exists() ? (snap.data() as PublicMandalSnapshot) : null);
        }
      } catch {
        if (active) setSnapshot(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [resolvedCode, mandal, activeUtsav, utsavEntries, computedTotals]);

  const pageUrl =
    typeof window !== 'undefined'
      ? resolvedCode
        ? `${window.location.origin}/m/${resolvedCode}`
        : window.location.href
      : '';
  const balance = snapshot ? snapshot.totalCollected - snapshot.totalSpent : 0;

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = lookupCode.trim().toUpperCase();
    if (cleaned) navigate(`/public/${cleaned}`);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F5F7FB] text-slate-900 flex flex-col pb-[env(safe-area-inset-bottom)] overscroll-y-contain selection:bg-blue-500/15">
      {PUBLIC_ANIMATION_STYLES}

      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(user ? '/home' : '/login')}
            className="h-9 px-3 rounded-2xl bg-white/95 hover:bg-slate-50 active:scale-95 border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(16,24,40,0.05)] text-xs font-bold text-slate-800 inline-flex items-center gap-1.5 transition-all touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>{user ? 'Back to App' : 'Open UtsavBook'}</span>
          </button>

          {snapshot && (
            <button
              type="button"
              onClick={() => {
                const text = encodeURIComponent(
                  `${snapshot.mandalName} Live Transparent Hisaab: ${pageUrl}`
                );
                window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
              }}
              className="h-9 px-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold shadow-xs shadow-blue-600/20 inline-flex items-center gap-1.5 transition-all touch-manipulation"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share on WhatsApp</span>
            </button>
          )}
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 pt-4 pb-10 space-y-4">
        {loading ? (
          <div className="rounded-[28px] bg-white/95 backdrop-blur-xl border border-slate-200/90 p-5 space-y-4 shadow-[0_8px_24px_-8px_rgba(16,24,40,0.06)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-200/70 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-44 rounded-lg bg-slate-200/70 animate-pulse" />
                <div className="h-3 w-32 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
            </div>
          </div>
        ) : !resolvedCode ? (
          /* Public Portal Code Lookup when visiting /public without join code */
          <form
            onSubmit={handleLookupSubmit}
            className="animate-public-in bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 p-7 text-center space-y-4 shadow-[0_8px_24px_-8px_rgba(16,24,40,0.06)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-extrabold text-slate-900">
                Public Transparency Portal
              </h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Enter any Mandal Join Code (e.g. MND-1234) to inspect their live collections,
                expenses, and Vastu Daan wall without signing in.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                placeholder="Enter Code (e.g. MND-W6W8)"
                className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm font-mono font-bold uppercase focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold"
              >
                View Ledger
              </button>
            </div>
          </form>
        ) : !snapshot ? (
          <div
            style={{ animationDelay: '0ms' }}
            className="animate-public-in bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 p-9 text-center space-y-3 shadow-[0_8px_24px_-8px_rgba(16,24,40,0.06)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center mx-auto">
              <FileX2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-extrabold text-slate-900">Mandal Page Not Found</h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Check the join code (<strong className="font-mono">{resolvedCode}</strong>) or ask
                the Mandal Treasurer to open UtsavBook once to sync their public ledger.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hero Summary Card */}
            <section
              style={{ animationDelay: '0ms' }}
              className="animate-public-in relative overflow-hidden rounded-[28px] bg-white/95 backdrop-blur-xl border border-slate-200/90 p-5 space-y-4 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.09),inset_0_1px_0_0_rgba(255,255,255,1)]"
            >
              <div className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
              <div className="pointer-events-none animate-public-orb absolute -right-10 -top-12 w-40 h-40 rounded-full bg-gradient-to-br from-blue-400/18 via-amber-300/10 to-transparent blur-2xl" />

              <div className="relative z-10 flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <img
                    src={resolveMandalLogoUrl(snapshot.logoUrl)}
                    alt={snapshot.mandalName}
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith(MANDAL_DEFAULT_EMBLEM)) {
                        e.currentTarget.src = MANDAL_DEFAULT_EMBLEM;
                      }
                    }}
                    className="w-14 h-14 rounded-2xl object-cover bg-blue-50 ring-2 ring-blue-500/20 border border-white shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white shadow-xs">
                    <Sparkles className="w-2.5 h-2.5" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-[18px] font-extrabold text-slate-900 tracking-tight truncate">
                      {snapshot.mandalName}
                    </h1>
                    {snapshot.isVerified && (
                      <BadgeCheck className="w-4 h-4 text-sky-600 shrink-0" aria-label="Verified" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-blue-700 mt-0.5 truncate">
                    {snapshot.utsavName} {snapshot.yearCycle ? `· ${snapshot.yearCycle}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mandal ka hisaab, sabke saamne
                  </p>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-3">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Collected
                  </div>
                  <div className="text-sm font-extrabold text-emerald-600 tabular-nums mt-0.5 truncate">
                    {formatINR(snapshot.totalCollected)}
                  </div>
                </div>

                <div className="rounded-2xl bg-red-50/70 border border-red-200/80 p-3">
                  <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                    Spent
                  </div>
                  <div className="text-sm font-extrabold text-red-600 tabular-nums mt-0.5 truncate">
                    {formatINR(snapshot.totalSpent)}
                  </div>
                </div>

                <div className="rounded-2xl bg-blue-50/90 border border-blue-200/80 p-3">
                  <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                    Balance
                  </div>
                  <div className="text-sm font-extrabold text-blue-950 tabular-nums mt-0.5 truncate">
                    {formatINR(balance)}
                  </div>
                </div>
              </div>
            </section>

            {/* Category Spending Chart + Breakdown */}
            <section
              style={{ animationDelay: '55ms' }}
              className="animate-public-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 space-y-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
                  Category Spending Breakdown
                </h2>
                {snapshot.categoryBreakdown.length > 0 && (
                  <span className="text-[11px] font-extrabold text-red-600 tabular-nums">
                    {formatINR(snapshot.totalSpent)}
                  </span>
                )}
              </div>

              {snapshot.categoryBreakdown.length === 0 ? (
                <p className="text-xs text-slate-500 py-1">No expenses recorded yet.</p>
              ) : (
                <>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={snapshot.categoryBreakdown.slice(0, 6)}
                        margin={{ top: 6, right: 8, left: 0, bottom: 4 }}
                      >
                        <XAxis
                          dataKey="head"
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 9)}…` : v)}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                          formatter={(v) => formatINR(Number(v ?? 0))}
                        />
                        <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                          {snapshot.categoryBreakdown.slice(0, 6).map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={SPEND_CHART_COLORS[idx % SPEND_CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5 pt-1 border-t border-slate-100">
                    {snapshot.categoryBreakdown.map((c) => {
                      const pct =
                        snapshot.totalSpent > 0
                          ? Math.min(100, Math.round((c.total / snapshot.totalSpent) * 100))
                          : 0;

                      return (
                        <div key={c.head} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-slate-800 truncate">{c.head}</span>
                            <div className="flex items-center gap-2 shrink-0 tabular-nums">
                              <span className="text-[10px] font-bold text-slate-400">{pct}%</span>
                              <span className="font-extrabold text-red-600">
                                {formatINR(c.total)}
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* In-Kind Vastu Daan Wall */}
            {snapshot.showDonorsPublic &&
              snapshot.publicGoods &&
              snapshot.publicGoods.length > 0 && (
                <section
                  style={{ animationDelay: '90ms' }}
                  className="animate-public-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-amber-200/90 p-4 space-y-2.5 shadow-[0_4px_16px_-6px_rgba(217,119,6,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-amber-800">
                      Vastu Daan / In-Kind Donor Wall
                    </h2>
                    <span className="text-[11px] font-extrabold tabular-nums px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900">
                      {snapshot.publicGoods.length}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {snapshot.publicGoods.map((g, idx) => {
                      const isGupt =
                        g.isAnonymous ||
                        g.donorName.toLowerCase().includes('gupt daan') ||
                        g.donorName.toLowerCase().includes('anonymous');
                      return (
                        <div
                          key={idx}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                <span>{isGupt ? 'Gupt Daan / Anonymous' : g.donorName}</span>
                                {isGupt && <EyeOff className="w-3 h-3 text-slate-400 shrink-0" />}
                              </div>
                              <div className="text-[11px] font-semibold text-amber-800 truncate">
                                {g.goodsDescription || g.head}
                                {g.quantity ? ` (${g.quantity})` : ''}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {!isGupt && g.flatOrAddress ? `${g.flatOrAddress} · ` : ''}
                                {formatReceiptDate(g.entryDate)}
                              </div>
                            </div>
                          </div>
                          {g.estimatedValue && g.estimatedValue > 0 ? (
                            <span className="text-[11px] font-extrabold text-amber-900 tabular-nums shrink-0">
                              Est. {formatINR(g.estimatedValue)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/70 shrink-0">
                              Vastu
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            {/* Live Donor Feed (Gupt Daan strictly masked) */}
            {snapshot.showDonorsPublic &&
              snapshot.publicDonors &&
              snapshot.publicDonors.length > 0 && (
                <section
                  style={{ animationDelay: '115ms' }}
                  className="animate-public-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 space-y-2.5 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
                      Live Vargani Donor Feed
                    </h2>
                    <span className="text-[11px] font-extrabold tabular-nums px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800">
                      {snapshot.publicDonors.length}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {snapshot.publicDonors.map((d, idx) => {
                      const isGupt =
                        d.donorName.toLowerCase().includes('gupt daan') ||
                        d.donorName.toLowerCase().includes('anonymous');
                      const initials = isGupt
                        ? 'GD'
                        : d.donorName
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();

                      return (
                        <div
                          key={idx}
                          className="py-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                                isGupt
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-blue-500/12 text-blue-800'
                              }`}
                            >
                              {isGupt ? <EyeOff className="w-3.5 h-3.5" /> : initials || 'V'}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {isGupt ? 'Gupt Daan / Anonymous' : d.donorName}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {!isGupt && d.flatOrAddress ? d.flatOrAddress : 'Community Donor'} ·{' '}
                                {formatReceiptDate(d.entryDate)}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-extrabold text-emerald-600 tabular-nums">
                              +{formatINR(d.amount)}
                            </div>
                            {d.receiptNumber && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {d.receiptNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            {/* QR Code for Notice Board */}
            <section
              style={{ animationDelay: '165ms' }}
              className="animate-public-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 flex items-center justify-between gap-4 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
            >
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800">
                  Notice Board QR
                </span>
                <div className="text-sm font-extrabold text-slate-900">
                  Scan to View Live Mandal Hisaab
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Print &amp; paste this QR on your Society Notice Board or Mandap Banner.
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs shrink-0">
                <QRCodeSVG value={pageUrl} size={68} level="M" fgColor="#0F172A" />
              </div>
            </section>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-400">
          <span>Powered by</span>
          <img
            src="/logo-icon.png"
            alt=""
            className="w-4 h-4 rounded-sm object-contain mix-blend-multiply"
          />
          <img src="/logo-text.png" alt="UtsavBook" className="h-3 w-auto object-contain" />
          <span>· Live Public Transparency</span>
        </div>
      </main>
    </div>
  );
}