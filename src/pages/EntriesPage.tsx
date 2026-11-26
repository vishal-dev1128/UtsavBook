import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  Check,
  ChevronDown,
  EyeOff,
  MessageCircle,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BillLightboxModal } from '../components/BillLightboxModal';
import { EntryDetailModal } from '../components/EntryModals';
import { WhatsAppStatusBadge } from '../components/WhatsAppStatusBadge';
import { useMandal } from '../context/MandalContext';
import {
  formatDayHeader,
  formatINR,
  formatReceiptDate,
} from '../lib/i18n';
import { shareReceiptWithImageOnWhatsApp } from '../lib/receiptService';
import { EntryType, LedgerEntry, PaymentMode } from '../types';

interface DropdownOption {
  value: string;
  label: string;
  badge?: ReactNode;
}

interface GlassFilterDropdownProps {
  ariaLabel: string;
  title: string;
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  icon: ReactNode;
}

function GlassFilterDropdown({
  ariaLabel,
  title,
  value,
  onChange,
  options,
  icon,
}: GlassFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 16 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const isFiltered = value !== 'ALL';

  const toggleMenu = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 216;
      const clampedLeft = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - menuWidth - 12)
      );
      setCoords({
        top: rect.bottom + 6,
        left: clampedLeft,
      });
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handleDismiss = () => setOpen(false);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={toggleMenu}
        className={`h-8 px-3 rounded-full border text-xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95 transition-all touch-manipulation ${
          isFiltered
            ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-[0_2px_8px_-2px_rgba(37,99,235,0.18)]'
            : 'bg-white/95 border-slate-200/90 text-slate-700 font-semibold hover:bg-slate-50'
        }`}
      >
        <span className={isFiltered ? 'text-blue-700' : 'text-slate-400'}>{icon}</span>
        <span className="max-w-[120px] truncate">{selectedOption?.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            open ? 'rotate-180 text-blue-700' : 'text-slate-400'
          }`}
        />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* Tap-Outside Backdrop */}
            <div
              className="fixed inset-0 z-[9998] bg-slate-950/[0.04]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Floating Liquid-Glass Popover */}
            <div
              role="listbox"
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: '216px',
              }}
              className="animate-dropdown-in z-[9999] max-h-64 overflow-y-auto p-1.5 rounded-2xl bg-white/95 backdrop-blur-2xl border border-slate-200/95 shadow-[0_20px_44px_-8px_rgba(15,23,42,0.22),0_0_0_1px_rgba(255,255,255,0.9)_inset]"
            >
              <div className="px-2.5 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                {title}
              </div>

              <div className="space-y-0.5">
                {options.map((opt) => {
                  const active = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors touch-manipulation ${
                        active
                          ? 'bg-blue-500/12 text-blue-950 font-bold'
                          : 'text-slate-700 font-medium hover:bg-slate-100/85 active:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {opt.badge}
                        <span className="truncate">{opt.label}</span>
                      </span>
                      {active && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

export function EntriesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as EntryType | null) || 'all';

  const {
    mandal,
    activeUtsav,
    utsavEntries,
    members,
    privacyMasked,
    effectiveRole,
    language,
    sendAutomatedWhatsAppReceipt,
    showToast,
    tr,
  } = useMandal();
  const [tab, setTab] = useState<'all' | EntryType>(
    initialType === 'income' || initialType === 'expense' || initialType === 'goods'
      ? initialType
      : 'all'
  );
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | PaymentMode>('ALL');
  const [collectorFilter, setCollectorFilter] = useState<string>('ALL');
  const [showVoided, setShowVoided] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [zoomBillEntry, setZoomBillEntry] = useState<LedgerEntry | null>(null);
  const [sharingEntryId, setSharingEntryId] = useState<string | null>(null);

  const handleQuickShareEntry = async (entry: LedgerEntry) => {
    if (sharingEntryId || !mandal) return;
    setSharingEntryId(entry.id);
    try {
      const shareRes = await shareReceiptWithImageOnWhatsApp({
        mandal,
        utsavName: activeUtsav
          ? `${activeUtsav.name} (${activeUtsav.yearCycle})`
          : 'Ganeshotsav',
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

  const tabs = useMemo(
    () =>
      [
        { id: 'all', label: tr('all') },
        { id: 'income', label: tr('income') },
        { id: 'expense', label: tr('expense') },
        { id: 'goods', label: tr('goods') },
      ] as const,
    [tr]
  );

  const modeOptions: DropdownOption[] = useMemo(
    () => [
      {
        value: 'ALL',
        label: 'All Modes',
        badge: <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />,
      },
      {
        value: 'UPI',
        label: 'UPI',
        badge: <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />,
      },
      {
        value: 'CASH',
        label: 'CASH',
        badge: <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />,
      },
      {
        value: 'BANK',
        label: 'BANK',
        badge: <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />,
      },
      {
        value: 'GOODS',
        label: 'GOODS',
        badge: <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />,
      },
    ],
    []
  );

  const memberOptions: DropdownOption[] = useMemo(
    () => [
      {
        value: 'ALL',
        label: 'All Members',
        badge: (
          <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-500 flex items-center justify-center shrink-0">
            <Users className="w-3 h-3" />
          </span>
        ),
      },
      ...members.map((m) => {
        const initials = m.name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return {
          value: m.uid,
          label: m.name,
          badge: (
            <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-800 text-[9px] font-extrabold flex items-center justify-center shrink-0">
              {initials || 'M'}
            </span>
          ),
        };
      }),
    ],
    [members]
  );

  const activeTabIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === tab)
  );

  const hasActiveFilters =
    search.trim() !== '' ||
    tab !== 'all' ||
    modeFilter !== 'ALL' ||
    collectorFilter !== 'ALL' ||
    showVoided;

  const resetAllFilters = () => {
    setSearch('');
    setTab('all');
    setModeFilter('ALL');
    setCollectorFilter('ALL');
    setShowVoided(false);
  };

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return utsavEntries.filter((e) => {
      if (!showVoided && e.isVoided) return false;
      if (tab !== 'all' && e.type !== tab) return false;
      if (modeFilter !== 'ALL' && e.paymentMode !== modeFilter) return false;
      if (collectorFilter !== 'ALL' && e.createdByUid !== collectorFilter) return false;
      if (q) {
        const hay = [
          e.titleOrDonorName,
          e.flatOrAddress,
          e.head,
          e.receiptNumber,
          e.goodsDescription,
          e.createdByName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [utsavEntries, showVoided, tab, modeFilter, collectorFilter, search]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, LedgerEntry[]>();
    for (const entry of filteredEntries) {
      const list = map.get(entry.entryDate) || [];
      list.push(entry);
      map.set(entry.entryDate, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEntries]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F5F7FB] text-slate-900 overscroll-y-contain selection:bg-blue-500/15">
      {/* 120fps Compositor-Only Keyframes + Clean Search Input */}
      <style>{`
        @keyframes entriesSlideUp {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0) scale(0.988);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes dropdownPopIn {
          0% {
            opacity: 0;
            transform: translate3d(0, -6px, 0) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        .animate-entry-in {
          will-change: transform, opacity;
          animation: entriesSlideUp 0.44s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-dropdown-in {
          will-change: transform, opacity;
          transform-origin: top left;
          animation: dropdownPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .clean-search-input::-webkit-search-cancel-button,
        .clean-search-input::-webkit-search-decoration {
          -webkit-appearance: none;
          appearance: none;
        }
      `}</style>

      {/* Sticky Liquid-Glass App Header */}
      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/75 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[18px] font-extrabold text-slate-900 tracking-tight leading-tight">
              {tr('entries')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {filteredEntries.length === 1
                ? '1 transaction shown'
                : `${filteredEntries.length} transactions shown`}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-xs font-extrabold text-slate-800 tabular-nums">
              {filteredEntries.length}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">total</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 pt-3.5 pb-8 space-y-3">
        {/* Equal-Width 3-Column Quick Action Bar */}
        {effectiveRole !== 'auditor' && (
          <div
            style={{ animationDelay: '0ms' }}
            className="animate-entry-in grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2"
          >
            <button
              type="button"
              onClick={() => navigate('/income')}
              className="min-w-0 h-10 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white text-xs font-bold shadow-xs shadow-blue-600/20 inline-flex items-center justify-center gap-1 transition-all whitespace-nowrap touch-manipulation"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span className="truncate">Income</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/expense')}
              className="min-w-0 h-10 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.97] text-white text-xs font-bold shadow-xs shadow-rose-600/20 inline-flex items-center justify-center gap-1 transition-all whitespace-nowrap touch-manipulation"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span className="truncate">Expense</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/goods')}
              title="Add In-Kind Goods / Vastu"
              className="min-w-0 h-10 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-[0.97] border border-amber-200/80 text-amber-900 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap touch-manipulation"
            >
              <Package className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="truncate">Goods</span>
            </button>
          </div>
        )}

        {/* Search & Filter Control Cluster */}
        <div
          style={{ animationDelay: '45ms' }}
          className="animate-entry-in space-y-2.5"
        >
          {/* Liquid-Glass Search Input */}
          <div className="relative group">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr('searchPlaceholder')}
              className="clean-search-input w-full h-11 pl-10 pr-10 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] focus:outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 active:scale-90 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 4-Segment Sliding Pill Tabs */}
          <div className="relative grid grid-cols-4 p-1 rounded-2xl bg-slate-200/75 border border-slate-200/80">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.12)] border border-slate-200/60 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                width: 'calc((100% - 8px) / 4)',
                transform: `translate3d(${activeTabIndex * 100}%, 0, 0)`,
                willChange: 'transform',
              }}
            />

            {tabs.map((item) => {
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`relative z-10 h-9 rounded-xl text-xs font-bold transition-colors duration-200 touch-manipulation ${
                    isActive ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Horizontal Filter Chips Strip with Portal Glass Dropdowns */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <GlassFilterDropdown
              ariaLabel="Filter by payment mode"
              title="Payment Mode"
              value={modeFilter}
              onChange={(val) => setModeFilter(val as 'ALL' | PaymentMode)}
              options={modeOptions}
              icon={<Wallet className="w-3.5 h-3.5" />}
            />

            <GlassFilterDropdown
              ariaLabel="Filter by collector"
              title="Member / Collector"
              value={collectorFilter}
              onChange={(val) => setCollectorFilter(val)}
              options={memberOptions}
              icon={<Users className="w-3.5 h-3.5" />}
            />

            <button
              type="button"
              onClick={() => setShowVoided((prev) => !prev)}
              className={`h-8 px-3 rounded-full border text-xs font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-all touch-manipulation ${
                showVoided
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white/95 text-slate-700 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              {showVoided ? 'Voided: Shown' : 'Show Voided'}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="h-8 px-2.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 active:scale-95 transition-all touch-manipulation"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Date-Grouped Transaction Ledger */}
        {groupedByDate.length === 0 ? (
          <div
            style={{ animationDelay: '90ms' }}
            className="animate-entry-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-9 text-center space-y-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
          >
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-extrabold text-slate-900">No matching entries</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Try clearing your search query or resetting the active filters.
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="h-9 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-xs font-bold text-blue-900 active:scale-95 transition-all"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-0.5">
            {groupedByDate.map(([dateStr, items], groupIdx) => {
              const dayIncome = items
                .filter((e) => !e.isVoided && e.type === 'income' && e.approvalStatus === 'approved')
                .reduce((s, e) => s + e.amount, 0);
              const dayExpense = items
                .filter((e) => !e.isVoided && e.type === 'expense' && e.approvalStatus === 'approved')
                .reduce((s, e) => s + e.amount, 0);
              const dayNet = dayIncome - dayExpense;

              return (
                <section
                  key={dateStr}
                  style={{ animationDelay: `${Math.min(groupIdx * 55, 300)}ms` }}
                  className="animate-entry-in space-y-2"
                >
                  {/* Crisp Date Header + Net Pill */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold tracking-[0.07em] uppercase text-slate-400">
                      {formatDayHeader(dateStr)}
                    </span>
                    <span
                      className={`text-[11px] font-extrabold tabular-nums px-2 py-0.5 rounded-full border ${
                        dayNet >= 0
                          ? 'bg-emerald-50/90 border-emerald-200/75 text-emerald-700'
                          : 'bg-red-50/90 border-red-200/75 text-red-600'
                      }`}
                    >
                      {dayNet >= 0 ? '+' : '−'}
                      {formatINR(Math.abs(dayNet), privacyMasked)}
                    </span>
                  </div>

                  {/* Elevated Glass Entry Card */}
                  <div className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-[0_4px_16px_-6px_rgba(15,23,42,0.05)]">
                    {items.map((entry) => (
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
                        className={`w-full px-4 py-3.5 flex flex-col gap-2 text-left hover:bg-slate-50/90 active:bg-slate-100/80 transition-all min-h-[64px] touch-manipulation cursor-pointer ${
                          entry.isVoided ? 'opacity-55' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 w-full">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                                entry.type === 'income'
                                  ? 'bg-emerald-50 border-emerald-200/70 text-emerald-600'
                                  : entry.type === 'expense'
                                  ? 'bg-red-50 border-red-200/70 text-red-600'
                                  : 'bg-amber-50 border-amber-200/70 text-amber-700'
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
                                <span
                                  className={`text-sm font-bold text-slate-900 truncate ${
                                    entry.isVoided ? 'line-through text-slate-500' : ''
                                  }`}
                                >
                                  {entry.titleOrDonorName}
                                </span>
                                {entry.isAnonymous && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                                    <EyeOff className="w-2.5 h-2.5" />
                                    Gupt
                                  </span>
                                )}
                                {entry.billPhotoUrl && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setZoomBillEntry(entry);
                                    }}
                                    className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 shrink-0 cursor-zoom-in"
                                  >
                                    <Camera className="w-2.5 h-2.5" />
                                    Bill
                                  </button>
                                )}
                                {entry.isVoided && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 shrink-0">
                                    Voided
                                  </span>
                                )}
                                {entry.approvalStatus === 'pending' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Pending
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {entry.flatOrAddress || entry.goodsDescription || entry.head} ·{' '}
                                <span className="font-semibold text-slate-600">
                                  {entry.paymentMode}
                                </span>
                                {entry.upiTransactionId ? ` · UTR ${entry.upiTransactionId}` : ''} ·{' '}
                                {entry.createdByName}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {entry.type === 'goods' ? (
                              <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/70">
                                In-Kind
                              </span>
                            ) : (
                              <div
                                className={`text-sm font-extrabold tabular-nums ${
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
                          <div className="pl-[52px] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 text-[10.5px] text-slate-400">
                              {entry.receiptNumber && (
                                <span className="font-mono truncate">{entry.receiptNumber}</span>
                              )}
                              {entry.type === 'income' && (
                                <WhatsAppStatusBadge
                                  status={entry.whatsappStatus}
                                  error={entry.whatsappError}
                                  compact
                                />
                              )}
                            </div>
                            {entry.type === 'income' && !entry.isVoided && (
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
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
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
    </div>
  );
}