import {
  ArrowDownRight,
  ArrowLeft,
  Bell,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  List,
  Minus,
  Search,
  X,
  ZoomIn,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BillLightboxModal } from '../components/BillLightboxModal';
import { EntryDetailModal } from '../components/EntryModals';
import { SlidingPillTabs, SlidingSwitch } from '../components/SlidingControls';
import { useMandal } from '../context/MandalContext';
import { compressImageFile, formatINR, formatReceiptDate } from '../lib/i18n';
import { EXPENSE_HEADS, LedgerEntry, PaymentMode } from '../types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const PAYMENT_MODES: PaymentMode[] = ['CASH', 'UPI', 'BANK'];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function todayIso(): string {
  return toIsoDate(new Date());
}

interface GlassDatePickerProps {
  value: string;
  onChange: (iso: string) => void;
}

function GlassDatePicker({ value, onChange }: GlassDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 16 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const currentTodayIso = useMemo(() => todayIso(), []);

  const openPicker = () => {
    const parsed = parseIsoDate(value);
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 280;
      const popoverHeight = 324;
      const clampedLeft = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - popoverWidth - 12)
      );
      const fitsBelow = rect.bottom + 8 + popoverHeight <= window.innerHeight - 12;
      setCoords({
        top: fitsBelow ? rect.bottom + 8 : Math.max(12, rect.top - popoverHeight - 8),
        left: clampedLeft,
      });
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handleResize = () => setOpen(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

  const calendarCells = useMemo(() => {
    const firstDayWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { iso: string; day: number; inCurrentMonth: boolean }[] = [];

    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
      cells.push({ iso: toIsoDate(d), day: d.getDate(), inCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      cells.push({ iso: toIsoDate(d), day, inCurrentMonth: true });
    }
    while (cells.length < 42) {
      const nextDay = cells.length - (firstDayWeekday + daysInMonth) + 1;
      const d = new Date(viewYear, viewMonth + 1, nextDay);
      cells.push({ iso: toIsoDate(d), day: d.getDate(), inCurrentMonth: false });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        aria-label="Select expense date"
        aria-expanded={open}
        className={`min-w-0 w-full min-h-[44px] px-3 rounded-xl border text-sm font-semibold inline-flex items-center justify-between gap-2 transition-all active:scale-[0.98] touch-manipulation ${
          open
            ? 'bg-white border-rose-500 ring-4 ring-rose-500/10 text-slate-900'
            : 'bg-[#F5F7FB] border-slate-200 text-slate-800 hover:bg-slate-100/80'
        }`}
      >
        <span className="truncate tabular-nums">{formatReceiptDate(value)}</span>
        <Calendar className="w-4 h-4 text-rose-600 shrink-0" />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-slate-950/[0.05]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-label="Choose expense date"
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: '280px',
              }}
              className="animate-popover-in z-[9999] p-3 rounded-[22px] bg-white/95 backdrop-blur-2xl border border-slate-200/95 shadow-[0_22px_48px_-10px_rgba(15,23,42,0.22),0_0_0_1px_rgba(255,255,255,0.9)_inset]"
            >
              {/* Month / Year Header */}
              <div className="flex items-center justify-between gap-1 pb-2.5">
                <div className="text-xs font-extrabold text-slate-900 tracking-tight pl-1">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    aria-label="Previous month"
                    className="w-7 h-7 rounded-lg bg-[#F5F7FB] hover:bg-slate-200/70 active:scale-90 text-slate-700 flex items-center justify-center transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Next month"
                    className="w-7 h-7 rounded-lg bg-[#F5F7FB] hover:bg-slate-200/70 active:scale-90 text-slate-700 flex items-center justify-center transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-0.5 text-center pb-1">
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1"
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarCells.map((cell) => {
                  const isSelected = cell.iso === value;
                  const isToday = cell.iso === currentTodayIso;
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => {
                        onChange(cell.iso);
                        setOpen(false);
                      }}
                      className={`h-8 rounded-xl text-xs font-bold tabular-nums flex items-center justify-center transition-all active:scale-90 touch-manipulation ${
                        isSelected
                          ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30 font-extrabold'
                          : isToday
                          ? 'bg-rose-50 text-rose-800 border border-rose-300/80'
                          : cell.inCurrentMonth
                          ? 'text-slate-800 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setViewYear(now.getFullYear());
                    setViewMonth(now.getMonth());
                    onChange(currentTodayIso);
                    setOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-[11px] font-extrabold text-rose-800 transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

export function ExpensePage() {
  const navigate = useNavigate();
  const {
    mandal,
    activeUtsav,
    utsavEntries,
    effectiveRole,
    privacyMasked,
    addExpenseEntry,
  } = useMandal();

  const [mobileTab, setMobileTab] = useState<'add' | 'list'>(
    effectiveRole === 'auditor' ? 'list' : 'add'
  );
  const [title, setTitle] = useState('');
  const [head, setHead] = useState<string>(EXPENSE_HEADS[0]);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [entryDate, setEntryDate] = useState(todayIso());
  const [vendorOrNote, setVendorOrNote] = useState('');
  const [paidOutOfPocket, setPaidOutOfPocket] = useState(false);
  const [billPhotoUrl, setBillPhotoUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [onlyWithBills, setOnlyWithBills] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [zoomBillEntry, setZoomBillEntry] = useState<LedgerEntry | null>(null);

  const expenseEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return utsavEntries.filter((e) => {
      if (e.isVoided || e.type !== 'expense') return false;
      if (statusFilter !== 'all' && e.approvalStatus !== statusFilter) return false;
      if (onlyWithBills && !e.billPhotoUrl) return false;
      if (q) {
        const hay = [e.titleOrDonorName, e.head, e.note, e.flatOrAddress, e.createdByName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [utsavEntries, statusFilter, onlyWithBills, search]);

  const summary = useMemo(() => {
    const all = utsavEntries.filter((e) => !e.isVoided && e.type === 'expense');
    let approvedTotal = 0;
    let pendingTotal = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    for (const e of all) {
      if (e.approvalStatus === 'approved') {
        approvedTotal += e.amount;
        approvedCount += 1;
      } else {
        pendingTotal += e.amount;
        pendingCount += 1;
      }
    }
    return { approvedTotal, pendingTotal, pendingCount, approvedCount };
  }, [utsavEntries]);

  if (!mandal || !activeUtsav) return null;

  const isAuditor = effectiveRole === 'auditor';
  const activePaymentIdx = Math.max(0, PAYMENT_MODES.indexOf(paymentMode));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 720, 0.72);
    setBillPhotoUrl(compressed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!title.trim() || !numericAmount || numericAmount <= 0) return;
    try {
      setSaving(true);
      await addExpenseEntry({
        title,
        head,
        amount: numericAmount,
        paymentMode,
        entryDate,
        vendorOrNote,
        billPhotoUrl,
        paidOutOfPocket,
      });
      setTitle('');
      setAmount('');
      setVendorOrNote('');
      setBillPhotoUrl(undefined);
      setPaidOutOfPocket(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-full bg-[#F5F7FB] text-slate-900 overscroll-y-contain selection:bg-blue-600/15">
      {/* 120fps Compositor-Only Keyframes + Clean Inputs */}
      <style>{`
        @keyframes expenseCardReveal {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0) scale(0.988);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes popoverPopIn {
          0% {
            opacity: 0;
            transform: translate3d(0, -6px, 0) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        .animate-expense-in {
          will-change: transform, opacity;
          animation: expenseCardReveal 0.44s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-popover-in {
          will-change: transform, opacity;
          transform-origin: top left;
          animation: popoverPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .no-number-spinner::-webkit-inner-spin-button,
        .no-number-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-number-spinner {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        .clean-search-input::-webkit-search-cancel-button,
        .clean-search-input::-webkit-search-decoration {
          -webkit-appearance: none;
          appearance: none;
        }
      `}</style>

      {/* Sticky Liquid-Glass App Header */}
      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
              aria-label="Back"
              className="w-10 h-10 rounded-2xl bg-white/95 border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(16,24,40,0.06)] flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-90 transition-all shrink-0 touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[17px] font-extrabold text-slate-900 truncate tracking-tight leading-tight">
                Expense / Javak
              </h1>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {activeUtsav.name} · {activeUtsav.yearCycle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {summary.pendingCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('/alerts')}
                className="h-9 px-3 rounded-full bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200/90 text-xs font-extrabold text-amber-900 inline-flex items-center gap-1.5 transition-all touch-manipulation"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span className="tabular-nums">{summary.pendingCount} Pending</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/entries?type=expense')}
              className="h-9 px-3 rounded-full bg-white/95 hover:bg-slate-50 active:scale-95 border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(16,24,40,0.05)] text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition-all touch-manipulation"
            >
              <List className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">All Entries</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 pt-3.5 pb-8 space-y-4">
        {/* Equal-Width 3-Column Concentric KPI Summary Card */}
        <section
          style={{ animationDelay: '0ms' }}
          className="animate-expense-in relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[22px] border border-slate-200/90 p-2.5 shadow-[0_8px_24px_-10px_rgba(16,24,40,0.07),inset_0_1px_0_0_rgba(255,255,255,1)]"
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/55 to-transparent" />

          <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
            <div className="min-w-0 rounded-[14px] bg-red-50/75 border border-red-200/80 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-red-700 truncate">
                Approved Spent
              </div>
              <div className="text-[15px] sm:text-lg font-extrabold text-red-600 tabular-nums mt-0.5 truncate">
                {formatINR(summary.approvedTotal, privacyMasked)}
              </div>
              <div className="text-[10px] font-semibold text-red-700/75 mt-0.5 tabular-nums truncate">
                {summary.approvedCount} vouchers
              </div>
            </div>

            <div className="min-w-0 rounded-[14px] bg-[#F5F7FB] border border-slate-200/75 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400 truncate">
                Pending
              </div>
              <div className="text-[15px] sm:text-lg font-extrabold text-amber-700 tabular-nums mt-0.5 truncate">
                {formatINR(summary.pendingTotal, privacyMasked)}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5 tabular-nums truncate">
                {summary.pendingCount} items
              </div>
            </div>

            <div className="min-w-0 rounded-[14px] bg-[#F5F7FB] border border-slate-200/75 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400 truncate">
                Vouchers
              </div>
              <div className="text-[15px] sm:text-lg font-extrabold text-slate-900 tabular-nums mt-0.5 truncate">
                {summary.approvedCount + summary.pendingCount}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">
                Active cycle
              </div>
            </div>
          </div>
        </section>

        {/* Mobile 2-Segment Sliding Switcher with Side Glide Animation */}
        {!isAuditor && (
          <div className="lg:hidden relative grid grid-cols-2 p-1 rounded-2xl bg-slate-200/75 border border-slate-200/80 shadow-inner">
            <div
              aria-hidden="true"
              style={{
                width: 'calc((100% - 8px) / 2)',
                transform: `translate3d(${mobileTab === 'add' ? 0 : 100}%, 0, 0)`,
                willChange: 'transform',
              }}
              className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-rose-600 shadow-[0_4px_12px_-2px_rgba(225,29,72,0.42),inset_0_1px_0_0_rgba(255,255,255,0.3)] transition-transform duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
            <button
              type="button"
              onClick={() => setMobileTab('add')}
              className={`relative z-10 h-10 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-all duration-200 touch-manipulation ${
                mobileTab === 'add'
                  ? 'text-white scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 active:scale-95'
              }`}
            >
              <Minus
                className={`w-4 h-4 stroke-[2.5] transition-transform duration-300 ${
                  mobileTab === 'add' ? 'rotate-0 scale-105' : 'rotate-90 scale-95 opacity-75'
                }`}
              />
              <span>Add Expense</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('list')}
              className={`relative z-10 h-10 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-all duration-200 touch-manipulation ${
                mobileTab === 'list'
                  ? 'text-white scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 active:scale-95'
              }`}
            >
              <List
                className={`w-4 h-4 transition-transform duration-300 ${
                  mobileTab === 'list' ? 'scale-105' : 'scale-95 opacity-75'
                }`}
              />
              <span>Vouchers ({expenseEntries.length})</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left: Add Expense Form */}
          {!isAuditor && (
            <section
              style={{ animationDelay: '65ms' }}
              className={`animate-expense-in lg:col-span-6 bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-5 shadow-[0_6px_20px_-6px_rgba(16,24,40,0.05)] ${
                mobileTab === 'add' ? 'block' : 'hidden lg:block'
              }`}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    − Add Expense / Javak
                  </h2>
                  <p className="text-xs text-slate-500">
                    Record vendor bills, mandap costs, or out-of-pocket expenses
                  </p>
                </div>

                {effectiveRole === 'collector' && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                    Collector expenses are routed to <strong>Alerts</strong> for Admin / Khajindar
                    approval before updating Net Balance.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expense Particulars / Vendor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chintamani Murti Kala / Sound System"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:bg-white focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      required
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="no-number-spinner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-base font-extrabold tabular-nums text-rose-600 focus:outline-none focus:bg-white focus:border-rose-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Expense Head
                    </label>
                    <select
                      value={head}
                      onChange={(e) => setHead(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm font-semibold focus:outline-none focus:bg-white focus:border-rose-500 transition-colors"
                    >
                      {EXPENSE_HEADS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Mode
                    </label>
                    {/* Connected Single-Row Segmented Pill with Sliding Side Indicator */}
                    <div
                      role="radiogroup"
                      aria-label="Payment Mode"
                      className="relative grid grid-cols-3 p-1 min-h-[44px] rounded-xl bg-[#F5F7FB] border border-slate-200/90 shadow-inner"
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          width: 'calc((100% - 8px) / 3)',
                          transform: `translate3d(${activePaymentIdx * 100}%, 0, 0)`,
                          willChange: 'transform',
                        }}
                        className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-[9px] bg-rose-600 shadow-[0_3px_10px_-2px_rgba(225,29,72,0.42),inset_0_1px_0_0_rgba(255,255,255,0.28)] transition-transform duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      />
                      {PAYMENT_MODES.map((m) => {
                        const active = paymentMode === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setPaymentMode(m)}
                            className={`relative z-10 rounded-[9px] text-xs font-extrabold tracking-wide transition-all duration-200 touch-manipulation ${
                              active
                                ? 'text-white scale-[1.02]'
                                : 'text-slate-600 hover:text-slate-900 active:scale-95'
                            }`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                    <GlassDatePicker value={entryDate} onChange={setEntryDate} />
                  </div>
                </div>

                <div
                  onClick={() => setPaidOutOfPocket((v) => !v)}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F5F7FB] border border-slate-200 cursor-pointer active:scale-[0.995] transition-transform"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Paid Out-of-Pocket (Personal Cash)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tag for reimbursement from Mandal fund
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <SlidingSwitch
                      checked={paidOutOfPocket}
                      onChange={setPaidOutOfPocket}
                      tone="rose"
                      ariaLabel="Paid out of pocket toggle"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bill / Vendor Note
                    </label>
                    <input
                      type="text"
                      placeholder="Bill no, vendor details..."
                      value={vendorOrNote}
                      onChange={(e) => setVendorOrNote(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:bg-white focus:border-rose-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bill / Parchi Photo
                    </label>
                    <label className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-dashed border-rose-300 text-xs font-bold text-rose-700 flex items-center justify-center gap-2 cursor-pointer hover:bg-rose-50 transition-colors">
                      <Camera className="w-4 h-4" />
                      <span>{billPhotoUrl ? 'Photo Attached ✓' : 'Attach Bill Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {billPhotoUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-[#F5F7FB] p-2">
                    <img
                      src={billPhotoUrl}
                      alt="Bill preview"
                      className="w-full max-h-40 object-contain rounded-lg"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-sm font-extrabold transition-all shadow-xs shadow-rose-600/20 disabled:opacity-60 touch-manipulation"
                >
                  {saving ? 'Saving...' : 'Save Expense Entry'}
                </button>
              </form>
            </section>
          )}

          {/* Right: Expense Vouchers Register */}
          <section
            style={{ animationDelay: '95ms' }}
            className={`animate-expense-in ${isAuditor ? 'lg:col-span-12' : 'lg:col-span-6'} space-y-3 ${
              isAuditor || mobileTab === 'list' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 space-y-3 shadow-[0_6px_20px_-6px_rgba(16,24,40,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  Expense Vouchers ({expenseEntries.length})
                </h2>
                <div className="flex flex-wrap items-center gap-1.5">
                  <SlidingPillTabs
                    value={statusFilter}
                    onChange={setStatusFilter}
                    tone="rose"
                    size="xs"
                    ariaLabel="Filter expense status"
                    className="min-w-[185px]"
                    options={[
                      { id: 'all', label: 'All' },
                      { id: 'approved', label: 'Approved' },
                      { id: 'pending', label: 'Pending' },
                    ]}
                  />
                  <button
                    type="button"
                    onClick={() => setOnlyWithBills((prev) => !prev)}
                    className={`h-8 px-2.5 rounded-xl text-[11px] font-bold border inline-flex items-center gap-1 active:scale-95 transition-all touch-manipulation ${
                      onlyWithBills
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-[#F5F7FB] text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Camera className="w-3 h-3" />
                    <span>With Bills</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vendor, head, or member..."
                  className="clean-search-input w-full min-h-[40px] pl-9 pr-8 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs focus:outline-none focus:bg-white focus:border-rose-500 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="w-5 h-5 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-[0_6px_20px_-6px_rgba(16,24,40,0.05)]">
              {expenseEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No expense vouchers match the current filter.
                </div>
              ) : (
                expenseEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedEntry(entry);
                    }}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/90 active:bg-slate-100/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {entry.billPhotoUrl ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomBillEntry(entry);
                          }}
                          title="View Bill Photo"
                          className="relative w-10 h-10 rounded-2xl overflow-hidden border border-rose-200 shrink-0 group"
                        >
                          <img
                            src={entry.billPhotoUrl}
                            alt="Bill"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-3.5 h-3.5 text-white" />
                          </span>
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200/70 text-red-600 flex items-center justify-center shrink-0">
                          <ArrowDownRight className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {entry.titleOrDonorName}
                          </span>
                          {entry.approvalStatus === 'pending' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 shrink-0">
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {entry.head} · {entry.paymentMode} · {formatReceiptDate(entry.entryDate)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-red-600 tabular-nums">
                        −{formatINR(entry.amount, privacyMasked)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {entry.billPhotoUrl ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomBillEntry(entry);
                            }}
                            className="font-bold text-rose-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            <ZoomIn className="w-3 h-3" />
                            <span>View Bill</span>
                          </button>
                        ) : (
                          entry.createdByName
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      <BillLightboxModal
        imageUrl={zoomBillEntry?.billPhotoUrl || null}
        title={zoomBillEntry?.titleOrDonorName}
        subtitle={
          zoomBillEntry
            ? `${zoomBillEntry.head} · ${formatINR(zoomBillEntry.amount)} · ${formatReceiptDate(
                zoomBillEntry.entryDate
              )}`
            : undefined
        }
        onClose={() => setZoomBillEntry(null)}
      />

      <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}