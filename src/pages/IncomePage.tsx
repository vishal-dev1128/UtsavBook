import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  EyeOff,
  IndianRupee,
  List,
  MessageCircle,
  Plus,
  QrCode,
  Search,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DigitalReceiptCard } from '../components/DigitalReceiptCard';
import { EntryDetailModal } from '../components/EntryModals';
import { SlidingPillTabs, SlidingSwitch } from '../components/SlidingControls';
import { UpiScannerModal } from '../components/UpiScannerModal';
import { WhatsAppCreditPackModal } from '../components/WhatsAppCreditPackModal';
import { WhatsAppStatusBadge } from '../components/WhatsAppStatusBadge';
import { useMandal } from '../context/MandalContext';
import {
  formatINR,
  formatReceiptDate,
  normalizeWhatsAppPhone,
} from '../lib/i18n';
import { prewarmReceiptAssets, shareReceiptWithImageOnWhatsApp } from '../lib/receiptService';
import { getAvailableWhatsAppCredits, INCOME_HEADS, LedgerEntry, PaymentMode } from '../types';

const PRESET_AMOUNTS = [101, 251, 501, 1101, 2501, 5001];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IncomePage() {
  const navigate = useNavigate();
  const {
    mandal,
    activeUtsav,
    utsavEntries,
    effectiveRole,
    privacyMasked,
    language,
    addIncomeEntry,
    findDuplicateIncome,
    sendAutomatedWhatsAppReceipt,
    showToast,
  } = useMandal();

  const [mobileTab, setMobileTab] = useState<'add' | 'list'>(
    effectiveRole === 'auditor' ? 'list' : 'add'
  );
  const [donorName, setDonorName] = useState('');
  const [flatOrAddress, setFlatOrAddress] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [head, setHead] = useState<string>(INCOME_HEADS[0]);
  const [amount, setAmount] = useState<string>('1101');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [entryDate, setEntryDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const availableCredits = getAvailableWhatsAppCredits(mandal);
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(true);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<LedgerEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState<LedgerEntry | null>(null);
  const [sharingRowId, setSharingRowId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'UPI' | 'CASH' | 'BANK'>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const incomeEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return utsavEntries.filter((e) => {
      if (e.isVoided || e.type !== 'income') return false;
      if (modeFilter !== 'ALL' && e.paymentMode !== modeFilter) return false;
      if (q) {
        const hay = [
          e.titleOrDonorName,
          e.flatOrAddress,
          e.head,
          e.receiptNumber,
          e.upiTransactionId,
          e.createdByName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [utsavEntries, modeFilter, search]);

  const totals = useMemo(() => {
    const all = utsavEntries.filter(
      (e) => !e.isVoided && e.type === 'income' && e.approvalStatus === 'approved'
    );
    const today = todayIso();
    let total = 0;
    let todayTotal = 0;
    const byMode = { UPI: 0, CASH: 0, BANK: 0 };
    for (const e of all) {
      total += e.amount;
      if (e.entryDate === today) todayTotal += e.amount;
      if (e.paymentMode === 'UPI' || e.paymentMode === 'CASH' || e.paymentMode === 'BANK') {
        byMode[e.paymentMode] += e.amount;
      }
    }
    return { total, todayTotal, count: all.length, byMode };
  }, [utsavEntries]);

  const liveSavedEntry = useMemo(
    () => (savedEntry ? utsavEntries.find((e) => e.id === savedEntry.id) || savedEntry : null),
    [savedEntry, utsavEntries]
  );

  useEffect(() => {
    prewarmReceiptAssets(mandal);
  }, [mandal]);

  if (!mandal || !activeUtsav) return null;

  const isAuditor = effectiveRole === 'auditor';

  const resetForm = () => {
    setDonorName('');
    setFlatOrAddress('');
    setDonorPhone('');
    setAmount('1101');
    setIsAnonymous(false);
    setNote('');
    setShowUpiQr(false);
    setDuplicateWarning(null);
    setSavedEntry(null);
  };

  const handleSubmit = async (e: React.FormEvent, ignoreDuplicate = false) => {
    e.preventDefault();
    if (saving) return;
    const numericAmount = Number(amount);
    if (!donorName.trim() || !numericAmount || numericAmount <= 0) return;

    if (!ignoreDuplicate) {
      const dup = findDuplicateIncome(donorName, numericAmount, entryDate);
      if (dup) {
        setDuplicateWarning(dup);
        return;
      }
    }

    try {
      setSaving(true);
      const created = await addIncomeEntry({
        donorName,
        flatOrAddress,
        donorPhone,
        head,
        amount: numericAmount,
        paymentMode,
        isAnonymous,
        entryDate,
        note,
        autoSendWhatsApp,
      });
      setSavedEntry(created);
      setDuplicateWarning(null);
      if (autoSendWhatsApp) {
        const shareRes = await shareReceiptWithImageOnWhatsApp({
          mandal,
          utsavName: `${activeUtsav.name} (${activeUtsav.yearCycle})`,
          entry: created,
          language,
          allowFallbackUrlOnGestureError: false,
        });
        if (shareRes.status === 'needs_tap') {
          showToast(
            "Receipt ready! Tap 'Share on WhatsApp' below to attach image & message.",
            'info'
          );
        } else if (
          shareRes.status === 'shared_with_image' ||
          shareRes.status === 'downloaded_and_opened_wa'
        ) {
          void sendAutomatedWhatsAppReceipt(created, undefined, language);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleQuickRowShare = async (entry: LedgerEntry) => {
    if (sharingRowId) return;
    setSharingRowId(entry.id);
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
      setSharingRowId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-full bg-[#F5F7FB] text-slate-900 pb-8 selection:bg-blue-600/15">
      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
              aria-label="Back"
              className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center text-slate-700 hover:bg-slate-50 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[17px] font-extrabold text-slate-900 truncate tracking-tight">
                Income / Vargani
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                {activeUtsav.name} · {activeUtsav.yearCycle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/entries?type=income')}
              className="h-9 px-3 rounded-full bg-white border border-slate-200/90 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 hover:bg-slate-50"
            >
              <List className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">All Entries</span>
            </button>
            <button
              type="button"
              onClick={() => setCreditModalOpen(true)}
              className={`min-h-[36px] px-3 rounded-full border text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                availableCredits > 10
                  ? 'bg-[#10B981]/12 border-[#10B981]/30 text-[#065F46]'
                  : availableCredits > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-red-50 border-red-200 text-[#EA580C]'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="tabular-nums">{availableCredits}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* KPI Strip */}
        <section
          style={{ animationDelay: '0ms' }}
          className="animate-page-in grid grid-cols-2 sm:grid-cols-4 gap-2.5"
        >
          <div className="rounded-2xl bg-white/95 border border-slate-200/90 p-3.5 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Collected
            </div>
            <div className="text-lg font-extrabold text-emerald-600 tabular-nums mt-1">
              {formatINR(totals.total, privacyMasked)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {totals.count} receipts
            </div>
          </div>
          <div className="rounded-2xl bg-white/95 border border-slate-200/90 p-3.5 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Today
            </div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-1">
              {formatINR(totals.todayTotal, privacyMasked)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Live date</div>
          </div>
          <div className="rounded-2xl bg-white/95 border border-slate-200/90 p-3.5 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              UPI + Bank
            </div>
            <div className="text-lg font-extrabold text-sky-700 tabular-nums mt-1">
              {formatINR(totals.byMode.UPI + totals.byMode.BANK, privacyMasked)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Digital</div>
          </div>
          <div className="rounded-2xl bg-white/95 border border-slate-200/90 p-3.5 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Cash
            </div>
            <div className="text-lg font-extrabold text-amber-700 tabular-nums mt-1">
              {formatINR(totals.byMode.CASH, privacyMasked)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">In-hand</div>
          </div>
        </section>

        {/* Mobile View Switcher with 120fps Sliding Pill */}
        {!isAuditor && (
          <div style={{ animationDelay: '35ms' }} className="lg:hidden animate-page-in">
            <SlidingPillTabs
              value={mobileTab}
              onChange={setMobileTab}
              tone="blue"
              ariaLabel="Income section view"
              options={[
                { id: 'add', label: 'Add Vargani', icon: <Plus className="w-4 h-4" /> },
                {
                  id: 'list',
                  label: `Receipts (${incomeEntries.length})`,
                  icon: <List className="w-4 h-4" />,
                },
              ]}
            />
          </div>
        )}

        {/* Split Layout: Form + Recent Income List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left: Add Vargani Form */}
          {!isAuditor && (
            <section
              style={{ animationDelay: '65ms' }}
              className={`animate-page-in lg:col-span-6 bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-5 shadow-xs ${
                mobileTab === 'add' ? 'block' : 'hidden lg:block'
              }`}
            >
              {liveSavedEntry ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold text-blue-700">
                        Digital Receipt Generated
                      </h2>
                      <WhatsAppStatusBadge
                        status={liveSavedEntry.whatsappStatus}
                        error={liveSavedEntry.whatsappError}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs font-bold text-slate-600 underline"
                    >
                      + Add Another
                    </button>
                  </div>
                  <DigitalReceiptCard
                    mandal={mandal}
                    utsavName={`${activeUtsav.name} (${activeUtsav.yearCycle})`}
                    entry={liveSavedEntry}
                    defaultLanguage={language}
                    onResendWhatsApp={async (lang) => {
                      const res = await sendAutomatedWhatsAppReceipt(liveSavedEntry, undefined, lang);
                      return res.receiptImageUrl;
                    }}
                  />
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full min-h-[46px] rounded-xl bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-extrabold transition-all shadow-xs cursor-pointer"
                  >
                    Record Next Vargani
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      + Add Income / Vargani
                    </h2>
                    <p className="text-xs text-slate-500">
                      Generates sequential receipt &amp; QR verification link
                    </p>
                  </div>

                  {/* Quick Amount Chips */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Quick Vargani Amount
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PRESET_AMOUNTS.map((preset) => {
                        const active = Number(amount) === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmount(String(preset))}
                            className={`min-h-[42px] rounded-xl text-sm font-bold tabular-nums border transition-colors ${
                              active
                                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                : 'bg-[#F5F7FB] text-slate-800 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {formatINR(preset)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amount & Payment Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Amount (₹) *
                      </label>
                      <div className="relative">
                        <IndianRupee className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          min={1}
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full min-h-[44px] pl-8 pr-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-base font-extrabold tabular-nums text-blue-700 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Payment Mode
                      </label>
                      <SlidingPillTabs
                        value={paymentMode}
                        onChange={(m) => setPaymentMode(m as PaymentMode)}
                        tone="blue"
                        size="md"
                        ariaLabel="Payment Mode"
                        options={[
                          { id: 'CASH', label: 'CASH' },
                          { id: 'UPI', label: 'UPI' },
                          { id: 'BANK', label: 'BANK' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Direct UPI Scanner Button (Opens Blurred Popup) */}
                  {paymentMode === 'UPI' && (
                    <div className="rounded-2xl bg-blue-50/45 border border-blue-200/80 p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900">
                            Mandal UPI Scanner
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {mandal.upiId || (mandal.upiQrUrl ? 'Custom UPI QR Ready' : 'Add UPI ID in Mandal Settings')}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowUpiQr(true)}
                        className="w-full min-h-[42px] px-3.5 rounded-xl bg-white hover:bg-blue-50/80 active:scale-[0.985] border border-blue-200/90 text-blue-800 text-xs font-extrabold inline-flex items-center justify-center gap-2 shadow-2xs transition-all touch-manipulation"
                      >
                        <QrCode className="w-4 h-4 text-[#2563EB] shrink-0" />
                        <span>
                          Open UPI Scanner
                          {Number(amount) > 0 ? ` · ${formatINR(Number(amount))}` : ''}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Donor Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Donor Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vishal Pawar"
                        value={donorName}
                        onChange={(e) => {
                          setDonorName(e.target.value);
                          setDuplicateWarning(null);
                        }}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Flat / Wing / Address
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Flat A-201"
                        value={flatOrAddress}
                        onChange={(e) => setFlatOrAddress(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        WhatsApp Mobile Number
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile (optional)"
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                      />
                      {(() => {
                        const normalizedPhone = normalizeWhatsAppPhone(donorPhone);
                        if (normalizedPhone) {
                          return (
                            <p className="mt-1 text-[10.5px] font-semibold text-emerald-700 tabular-nums">
                              WhatsApp target: +{normalizedPhone}
                            </p>
                          );
                        }
                        if (donorPhone.replace(/\D/g, '').length > 0 || autoSendWhatsApp) {
                          return (
                            <p className="mt-1 text-[10.5px] font-medium text-slate-500">
                              Enter 10-digit WhatsApp number (optional — opens WhatsApp directly)
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Income Head
                      </label>
                      <select
                        value={head}
                        onChange={(e) => setHead(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                      >
                        {INCOME_HEADS.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Note
                      </label>
                      <input
                        type="text"
                        placeholder="Optional note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Gupt Daan Toggle */}
                  <div
                    onClick={() => setIsAnonymous((v) => !v)}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F5F7FB] border border-slate-200 cursor-pointer active:scale-[0.995] transition-transform"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <EyeOff className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Gupt Daan (Hide Name Publicly)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Shown as &quot;Gupt Daan / Anonymous&quot; on public ledger
                        </div>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <SlidingSwitch
                        checked={isAnonymous}
                        onChange={setIsAnonymous}
                        tone="blue"
                        ariaLabel="Gupt Daan toggle"
                      />
                    </div>
                  </div>

                  {/* 1-Click Share on WhatsApp Toggle (100% Free, Zero API) */}
                  <div
                    onClick={() => setAutoSendWhatsApp((v) => !v)}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-[0.995] ${
                      autoSendWhatsApp
                        ? 'bg-blue-50/55 border-blue-200/90 hover:bg-blue-50/80'
                        : 'bg-[#F5F7FB] border-slate-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900">
                            Share on WhatsApp (On Save)
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46] text-[10.5px] font-extrabold">
                            100% Free · 1-Click
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 leading-snug">
                          Generates Minimal Receipt PNG and attaches it with a heartfelt Thank You message
                        </div>
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <SlidingSwitch
                        checked={autoSendWhatsApp}
                        onChange={setAutoSendWhatsApp}
                        tone="blue"
                        ariaLabel="Share on WhatsApp toggle"
                      />
                    </div>
                  </div>

                  {duplicateWarning && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2">
                      <div className="flex items-start gap-2 text-xs text-amber-900 font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <span>
                          Possible duplicate: <strong>{duplicateWarning.titleOrDonorName}</strong>{' '}
                          paid <strong>{formatINR(duplicateWarning.amount)}</strong> on{' '}
                          {formatReceiptDate(duplicateWarning.entryDate)} (
                          {duplicateWarning.receiptNumber}).
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleSubmit(e, true)}
                          className="min-h-[36px] px-3 rounded-xl bg-amber-600 text-white text-xs font-bold"
                        >
                          Save Anyway
                        </button>
                        <button
                          type="button"
                          onClick={() => setDuplicateWarning(null)}
                          className="min-h-[36px] px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full min-h-[48px] rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-extrabold transition-colors shadow-xs disabled:opacity-60"
                  >
                    {saving ? 'Generating Receipt...' : 'Save & Generate Digital Receipt'}
                  </button>
                </form>
              )}
            </section>
          )}

          {/* Right: Income / Vargani Register */}
          <section
            style={{ animationDelay: '95ms' }}
            className={`animate-page-in ${isAuditor ? 'lg:col-span-12' : 'lg:col-span-6'} space-y-3 ${
              isAuditor || mobileTab === 'list' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  Vargani Receipts ({incomeEntries.length})
                </h2>
                <SlidingPillTabs
                  value={modeFilter}
                  onChange={setModeFilter}
                  tone="blue"
                  size="xs"
                  ariaLabel="Filter by payment mode"
                  className="min-w-[210px]"
                  options={[
                    { id: 'ALL', label: 'ALL' },
                    { id: 'UPI', label: 'UPI' },
                    { id: 'CASH', label: 'CASH' },
                    { id: 'BANK', label: 'BANK' },
                  ]}
                />
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search donor, flat, UTR, receipt no..."
                  className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-white/95 rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {incomeEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No Vargani receipts match the current filter.
                </div>
              ) : (
                incomeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEntry(entry)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedEntry(entry);
                      }
                    }}
                    className="w-full px-4 py-3.5 flex flex-col gap-2 text-left hover:bg-slate-50/90 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0">
                          <ArrowUpRight className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {entry.titleOrDonorName}
                            </span>
                            {entry.isAnonymous && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                                Gupt
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {entry.flatOrAddress || entry.head} · {entry.paymentMode}
                            {entry.upiTransactionId ? ` · UTR ${entry.upiTransactionId}` : ''} ·{' '}
                            {formatReceiptDate(entry.entryDate)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-emerald-600 tabular-nums">
                          +{formatINR(entry.amount, privacyMasked)}
                        </div>
                      </div>
                    </div>

                    <div className="pl-[52px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 text-[10.5px] text-slate-400">
                        {entry.receiptNumber && (
                          <span className="font-mono truncate">{entry.receiptNumber}</span>
                        )}
                        <WhatsAppStatusBadge
                          status={entry.whatsappStatus}
                          error={entry.whatsappError}
                          compact
                        />
                      </div>
                      <button
                        type="button"
                        disabled={sharingRowId === entry.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleQuickRowShare(entry);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200/90 text-blue-700 text-[10.5px] font-bold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                      >
                        <MessageCircle className="w-3 h-3 shrink-0" />
                        {sharingRowId === entry.id ? (
                          <span>Sharing...</span>
                        ) : (
                          <>
                            <span className="sm:hidden">Share</span>
                            <span className="hidden sm:inline">Share on WhatsApp</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      <UpiScannerModal
        open={showUpiQr}
        onClose={() => setShowUpiQr(false)}
        mandal={mandal}
        activeUtsav={activeUtsav}
        amount={Number(amount) || undefined}
        donorName={donorName}
        onOpenSettings={
          effectiveRole === 'admin' ? () => navigate('/mandal/details') : undefined
        }
      />

      <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />

      <WhatsAppCreditPackModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        onPurchased={() => setAutoSendWhatsApp(true)}
        onContinueWithoutWhatsApp={() => setAutoSendWhatsApp(false)}
      />
    </div>
  );
}
