import { toJpeg } from 'html-to-image';
import {
  AlertCircle,
  ArrowDownUp,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { SlidingSwitch } from '../components/SlidingControls';
import { useMandal } from '../context/MandalContext';
import {
  buildWhatsAppSummaryText,
  downloadCsv,
  exportHisabPdf,
  formatINR,
} from '../lib/i18n';
import {
  downloadExcelLedger,
  downloadImportTemplateExcel,
  ImportedLedgerRow,
  parseLedgerImportFile,
} from '../lib/ledgerImport';
import {
  EXPENSE_HEADS,
  INCOME_HEADS,
  MANDAL_DEFAULT_EMBLEM,
  PaymentMode,
  resolveMandalLogoUrl,
} from '../types';

type DatePreset = 'today' | '7d' | '30d' | 'month' | 'all';
type BreakdownTab = 'head' | 'collectors' | 'mode' | 'audit';
type SortOrder = 'desc' | 'asc' | 'alpha';

const TYPE_OPTIONS = ['all', 'income', 'expense'] as const;

export function ReportsPage() {
  const {
    mandal,
    activeUtsav,
    utsavEntries,
    members,
    auditLogs,
    computedTotals,
    currentMember,
    effectiveRole,
    privacyMasked,
    requestCashHandover,
    importEntriesBatch,
    showToast,
    tr,
  } = useMandal();

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('head');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [jamaAmount, setJamaAmount] = useState('');
  const [jamaBusy, setJamaBusy] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importRows, setImportRows] = useState<ImportedLedgerRow[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importError, setImportError] = useState('');
  const [parsingImport, setParsingImport] = useState(false);
  const [savingImport, setSavingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rangedEntries = useMemo(() => {
    const active = utsavEntries.filter((e) => !e.isVoided && e.approvalStatus === 'approved');
    if (datePreset === 'all') return active;

    // Anchor relative filters to the latest entry date or today
    const todayStr = new Date().toISOString().slice(0, 10);
    const latestStr = active[0]?.entryDate || todayStr;
    const anchor = new Date(`${latestStr > todayStr ? latestStr : todayStr}T00:00:00`);

    return active.filter((e) => {
      const d = new Date(`${e.entryDate}T00:00:00`);
      const diffDays = (anchor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (datePreset === 'today') return e.entryDate === latestStr;
      if (datePreset === '7d') return diffDays <= 7;
      if (datePreset === '30d') return diffDays <= 30;
      if (datePreset === 'month') {
        return d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear();
      }
      return true;
    });
  }, [utsavEntries, datePreset]);

  const summary = useMemo(() => {
    const collected = rangedEntries
      .filter((e) => String(e.type).toLowerCase() === 'income')
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const spent = rangedEntries
      .filter((e) => String(e.type).toLowerCase() === 'expense')
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    return { collected, spent, inHand: collected - spent };
  }, [rangedEntries]);

  const byHeadRows = useMemo(() => {
    const map = new Map<
      string,
      { head: string; type: 'income' | 'expense'; total: number; count: number }
    >();
    for (const e of rangedEntries) {
      if (e.type === 'goods') continue;
      if (typeFilter !== 'all' && e.type !== typeFilter) continue;
      const key = `${e.type}::${e.head}`;
      const existing = map.get(key) || { head: e.head, type: e.type, total: 0, count: 0 };
      existing.total += e.amount;
      existing.count += 1;
      map.set(key, existing);
    }
    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (sortOrder === 'asc') return a.total - b.total;
      if (sortOrder === 'alpha') return a.head.localeCompare(b.head);
      return b.total - a.total;
    });
    return list;
  }, [rangedEntries, typeFilter, sortOrder]);

  const collectorRows = useMemo(() => {
    const list = members.map((m) => {
      const memberEntries = rangedEntries.filter(
        (e) => e.type === 'income' && e.createdByUid === m.uid
      );
      const totalCollected = memberEntries.reduce((s, e) => s + e.amount, 0);
      return {
        member: m,
        count: memberEntries.length,
        totalCollected,
      };
    });
    list.sort((a, b) => {
      if (sortOrder === 'asc') return a.totalCollected - b.totalCollected;
      if (sortOrder === 'alpha') return a.member.name.localeCompare(b.member.name);
      return b.totalCollected - a.totalCollected;
    });
    return list;
  }, [members, rangedEntries, sortOrder]);

  const byModeRows = useMemo(() => {
    const modes = ['UPI', 'CASH', 'BANK'] as const;
    return modes.map((mode) => {
      const inflow = rangedEntries
        .filter((e) => e.type === 'income' && e.paymentMode === mode)
        .reduce((s, e) => s + e.amount, 0);
      const outflow = rangedEntries
        .filter((e) => e.type === 'expense' && e.paymentMode === mode)
        .reduce((s, e) => s + e.amount, 0);
      return { mode, inflow, outflow, net: inflow - outflow };
    });
  }, [rangedEntries]);

  if (!mandal || !activeUtsav) return null;

  const dateLabelMap: Record<DatePreset, string> = {
    today: tr('today'),
    '7d': tr('last7Days'),
    '30d': tr('last30Days'),
    month: tr('thisMonth'),
    all: tr('fullUtsav'),
  };

  const breakdownTabs = [
    { id: 'head', label: tr('byHead') },
    { id: 'collectors', label: tr('collectors') },
    { id: 'mode', label: tr('byMode') },
    { id: 'audit', label: 'Audit Log' },
  ] as const;

  const activeBreakdownIdx = Math.max(
    0,
    breakdownTabs.findIndex((t) => t.id === breakdownTab)
  );
  const activeTypeIdx = Math.max(0, TYPE_OPTIONS.indexOf(typeFilter));

  const maxHeadAmount = Math.max(1, ...byHeadRows.map((r) => r.total));
  const publicUrl = `${window.location.origin}/m/${mandal.joinCode}`;
  const isNegativeBalance = summary.inHand < 0;

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    const dataUrl = await toJpeg(posterRef.current, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#FFFDF9',
    });
    const link = document.createElement('a');
    link.download = `${mandal.joinCode}-${activeUtsav.name}-hisab-poster.jpg`;
    link.href = dataUrl;
    link.click();
  };

  const handleShareWhatsAppSummary = () => {
    const msg = buildWhatsAppSummaryText({
      mandalName: mandal.name,
      utsavName: activeUtsav.name,
      yearCycle: activeUtsav.yearCycle,
      collected: summary.collected,
      spent: summary.spent,
      balance: summary.inHand,
      publicUrl,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const resetImportModalState = () => {
    setImportFileName('');
    setImportRows([]);
    setImportWarnings([]);
    setImportError('');
    setParsingImport(false);
    setSavingImport(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenImportModal = () => {
    resetImportModalState();
    setShowImportModal(true);
  };

  const handleImportFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError('');
    setImportWarnings([]);
    setParsingImport(true);
    try {
      const parsed = await parseLedgerImportFile(file);
      setImportRows(parsed.rows);
      setImportWarnings(parsed.warnings);
    } catch (err) {
      setImportRows([]);
      setImportError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setParsingImport(false);
    }
  };

  const updateImportRow = (rowId: string, patch: Partial<ImportedLedgerRow>) => {
    setImportRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };

  const removeImportRow = (rowId: string) => {
    setImportRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const selectedImportRows = importRows.filter(
    (r) => r.selected && (r.type === 'goods' || r.amount > 0)
  );
  const selectedIncomeSum = selectedImportRows
    .filter((r) => r.type === 'income')
    .reduce((s, r) => s + r.amount, 0);
  const selectedExpenseSum = selectedImportRows
    .filter((r) => r.type === 'expense')
    .reduce((s, r) => s + r.amount, 0);
  const allRowsSelected = importRows.length > 0 && importRows.every((r) => r.selected);

  const handleConfirmImport = async () => {
    if (selectedImportRows.length === 0 || savingImport) return;
    setSavingImport(true);
    setImportError('');
    try {
      await importEntriesBatch(selectedImportRows);
      setShowImportModal(false);
      resetImportModalState();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import entries');
    } finally {
      setSavingImport(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-full bg-[#F5F7FB] text-slate-900 overscroll-y-contain selection:bg-blue-600/15">
      {/* 120fps Compositor-Only Keyframes + Clean Number Inputs */}
      <style>{`
        @keyframes reportsCardReveal {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0) scale(0.988);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes reportsStepFade {
          0% {
            opacity: 0;
            transform: translate3d(0, 6px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes reportsModalPop {
          0% {
            opacity: 0;
            transform: translate3d(0, 16px, 0) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        .animate-report-in {
          will-change: transform, opacity;
          animation: reportsCardReveal 0.44s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-report-step {
          will-change: transform, opacity;
          animation: reportsStepFade 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-report-modal {
          will-change: transform, opacity;
          animation: reportsModalPop 0.26s cubic-bezier(0.16, 1, 0.3, 1) both;
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
      `}</style>

      {/* Sticky Liquid-Glass App Header */}
      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[18px] font-extrabold text-slate-900 tracking-tight leading-tight">
              {tr('reports')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {activeUtsav.name} · {activeUtsav.yearCycle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPosterModal(true)}
            className="h-9 px-3.5 rounded-full bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-200/90 shadow-[0_2px_8px_-2px_rgba(217,119,6,0.12)] text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all touch-manipulation"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
            <span>Summary Poster</span>
          </button>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 pt-3.5 pb-8 space-y-3.5">
        {/* Date Filter Pills */}
        <div
          style={{ animationDelay: '0ms' }}
          className="animate-report-in flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
        >
          {(['today', '7d', '30d', 'month', 'all'] as DatePreset[]).map((preset) => {
            const active = datePreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setDatePreset(preset)}
                className={`h-8 px-3.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border active:scale-95 transition-all touch-manipulation ${
                  active
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs shadow-blue-600/20'
                    : 'bg-white/95 text-slate-600 border-slate-200/90 hover:bg-slate-50'
                }`}
              >
                {dateLabelMap[preset]}
              </button>
            );
          })}
        </div>

        {/* Section 1: 3-Column Equal-Width Summary Card */}
        <section
          style={{ animationDelay: '45ms' }}
          className="animate-report-in relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[22px] border border-slate-200/90 p-2.5 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.07),inset_0_1px_0_0_rgba(255,255,255,1)]"
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

          <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
            <div className="min-w-0 rounded-[14px] bg-emerald-50/60 border border-emerald-200/75 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-emerald-700 truncate">
                {tr('collected')}
              </div>
              <div className="text-[15px] sm:text-base font-extrabold text-emerald-600 tabular-nums mt-0.5 truncate">
                {formatINR(summary.collected, privacyMasked)}
              </div>
            </div>

            <div className="min-w-0 rounded-[14px] bg-red-50/60 border border-red-200/75 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-red-700 truncate">
                {tr('spent')}
              </div>
              <div className="text-[15px] sm:text-base font-extrabold text-red-600 tabular-nums mt-0.5 truncate">
                {formatINR(summary.spent, privacyMasked)}
              </div>
            </div>

            <div
              className={`min-w-0 rounded-[14px] border px-3 py-2.5 transition-colors ${
                isNegativeBalance
                  ? 'bg-rose-50/85 border-rose-200/80'
                  : 'bg-blue-50/85 border-blue-200/80'
              }`}
            >
              <div
                className={`text-[10px] font-bold uppercase tracking-[0.06em] truncate ${
                  isNegativeBalance ? 'text-rose-700' : 'text-blue-800'
                }`}
              >
                {tr('inHand')}
              </div>
              <div
                className={`text-[15px] sm:text-base font-extrabold tabular-nums mt-0.5 truncate ${
                  isNegativeBalance ? 'text-rose-700' : 'text-blue-950'
                }`}
              >
                {formatINR(summary.inHand, privacyMasked)}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Unified Export & Import Action Bar */}
        <section
          style={{ animationDelay: '90ms' }}
          className="animate-report-in bg-white/95 backdrop-blur-xl rounded-[22px] border border-slate-200/90 p-2.5 space-y-2 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.06),inset_0_1px_0_0_rgba(255,255,255,1)]"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                exportHisabPdf({
                  mandal,
                  utsav: activeUtsav,
                  entries: rangedEntries,
                  dateLabel: dateLabelMap[datePreset],
                  members,
                });
                showToast('Notice Board Statement PDF downloaded!');
              }}
              className="min-w-0 h-10 px-2.5 rounded-[14px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.97] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-xs shadow-blue-600/20 whitespace-nowrap transition-all touch-manipulation"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span className="truncate">Notice PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                downloadExcelLedger(
                  rangedEntries,
                  `${mandal.joinCode}-${activeUtsav.name}-${datePreset}.xlsx`
                );
                showToast('Excel ledger downloaded!');
              }}
              title="Download Excel (.xlsx)"
              className="min-w-0 h-10 px-2.5 rounded-[14px] bg-[#F5F7FB] hover:bg-slate-100 active:scale-[0.97] border border-slate-200/85 text-xs font-bold text-slate-800 inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all touch-manipulation"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Excel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                downloadCsv(
                  rangedEntries,
                  `${mandal.joinCode}-${activeUtsav.name}-${datePreset}.csv`
                );
                showToast('CSV ledger downloaded!');
              }}
              title="Download CSV"
              className="min-w-0 h-10 px-2.5 rounded-[14px] bg-[#F5F7FB] hover:bg-slate-100 active:scale-[0.97] border border-slate-200/85 text-xs font-bold text-slate-800 inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all touch-manipulation"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">CSV</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsAppSummary}
              className="min-w-0 h-10 px-2.5 rounded-[14px] bg-[#F5F7FB] hover:bg-blue-50/70 active:scale-[0.97] border border-slate-200/85 text-xs font-bold text-slate-800 inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all touch-manipulation"
            >
              <MessageCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">WhatsApp</span>
            </button>
          </div>

          {effectiveRole !== 'auditor' && (
            <button
              type="button"
              onClick={handleOpenImportModal}
              className="w-full h-10 px-3 rounded-[14px] bg-blue-50/60 hover:bg-blue-50 active:scale-[0.985] border border-dashed border-blue-300/90 text-xs font-bold text-blue-900 inline-flex items-center justify-center gap-1.5 transition-all touch-manipulation"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Import PDF / Excel (.xlsx, .xls, .csv)</span>
            </button>
          )}
        </section>

        {/* Filters & Order Controls */}
        <div
          style={{ animationDelay: '135ms' }}
          className="animate-report-in space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowFilterBar((prev) => !prev)}
              className={`h-9 px-3 rounded-full border text-xs font-bold inline-flex items-center gap-1.5 active:scale-95 transition-all touch-manipulation ${
                showFilterBar || typeFilter !== 'all'
                  ? 'bg-blue-50 border-blue-300 text-blue-900'
                  : 'bg-white/95 border-slate-200/90 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {tr('filters')}
                {typeFilter !== 'all' ? ` (${typeFilter})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setSortOrder((prev) =>
                  prev === 'desc' ? 'asc' : prev === 'asc' ? 'alpha' : 'desc'
                )
              }
              className="h-9 px-3 rounded-full bg-white/95 hover:bg-slate-50 active:scale-95 border border-slate-200/90 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition-all touch-manipulation"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {tr('order')}:{' '}
                {sortOrder === 'desc' ? 'Highest' : sortOrder === 'asc' ? 'Lowest' : 'A–Z'}
              </span>
            </button>
          </div>

          {/* Collapsible 3-Segment Sliding Type Filter */}
          {showFilterBar && (
            <div className="animate-report-step relative grid grid-cols-3 p-1 rounded-2xl bg-slate-200/75 border border-slate-200/80">
              <div
                aria-hidden="true"
                style={{
                  width: 'calc((100% - 8px) / 3)',
                  transform: `translate3d(${activeTypeIdx * 100}%, 0, 0)`,
                  willChange: 'transform',
                }}
                className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.12)] border border-slate-200/60 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              />
              {TYPE_OPTIONS.map((t) => {
                const active = typeFilter === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={`relative z-10 h-9 rounded-xl text-xs font-bold capitalize transition-colors touch-manipulation ${
                      active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}

          {/* 4-Segment Sliding Breakdown Tabs */}
          <div className="relative grid grid-cols-4 p-1 rounded-2xl bg-slate-200/75 border border-slate-200/80">
            <div
              aria-hidden="true"
              style={{
                width: 'calc((100% - 8px) / 4)',
                transform: `translate3d(${activeBreakdownIdx * 100}%, 0, 0)`,
                willChange: 'transform',
              }}
              className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.12)] border border-slate-200/60 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
            {breakdownTabs.map((item) => {
              const active = breakdownTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBreakdownTab(item.id)}
                  className={`relative z-10 h-9 rounded-xl text-[11px] sm:text-xs font-bold transition-colors touch-manipulation truncate px-1 ${
                    active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Breakdown Content */}
        {breakdownTab === 'head' && (
          <div key="tab-head" className="animate-report-step space-y-2.5">
            {byHeadRows.length === 0 ? (
              <div className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-8 text-center text-xs text-slate-500 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.05)]">
                No transactions in this period.
              </div>
            ) : (
              byHeadRows.map((row) => {
                const pct = Math.max(4, Math.round((row.total / maxHeadAmount) * 100));
                const isInc = row.type === 'income';
                const cap = !isInc ? activeUtsav.categoryBudgets?.[row.head] : undefined;
                const capPct = cap && cap > 0 ? Math.round((row.total / cap) * 100) : 0;

                return (
                  <div
                    key={`${row.type}-${row.head}`}
                    className="relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[22px] border border-slate-200/90 px-4 py-3.5 shadow-[0_4px_14px_-6px_rgba(15,23,42,0.04)]"
                  >
                    <div
                      className={`pointer-events-none absolute inset-y-0 left-0 transition-all duration-500 ${
                        isInc ? 'bg-blue-500/[0.08]' : 'bg-rose-500/[0.08]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-extrabold text-slate-900 truncate">
                            {row.head}
                          </span>
                          {cap && cap > 0 && (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums ${
                                capPct > 100
                                  ? 'bg-rose-100 text-rose-700'
                                  : capPct >= 80
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {capPct}% of {formatINR(cap, privacyMasked)}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span
                            className={`font-bold ${
                              isInc ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {isInc ? 'Income' : 'Expense'}
                          </span>{' '}
                          · {row.count} {row.count === 1 ? 'entry' : 'entries'}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-extrabold tabular-nums shrink-0 ${
                          isInc ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {isInc ? '+' : '−'}
                        {formatINR(row.total, privacyMasked)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {breakdownTab === 'collectors' && (
          <div key="tab-collectors" className="animate-report-step space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white/95 border border-slate-200/90 p-3.5 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Main Treasury
                </div>
                <div className="text-base font-extrabold text-blue-700 tabular-nums mt-0.5">
                  {formatINR(computedTotals.balance - computedTotals.collectorCashTotal, privacyMasked)}
                </div>
              </div>
              <div className="rounded-2xl bg-amber-50/90 border border-amber-200/80 p-3.5 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  With Collectors
                </div>
                <div className="text-base font-extrabold text-amber-900 tabular-nums mt-0.5">
                  {formatINR(computedTotals.collectorCashTotal, privacyMasked)}
                </div>
              </div>
            </div>
            {currentMember && currentMember.cashInHand > 0 && (
              <div className="relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[24px] border border-amber-300/90 p-4 space-y-3 shadow-[0_6px_20px_-6px_rgba(217,119,6,0.12)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-blue-500 to-amber-400" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      Your Cash-in-Hand (Jama Pending)
                    </span>
                  </div>
                  <span className="text-base font-extrabold text-amber-800 tabular-nums">
                    {formatINR(currentMember.cashInHand, privacyMasked)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder={`Amount (max ₹${currentMember.cashInHand})`}
                    value={jamaAmount}
                    onChange={(e) => setJamaAmount(e.target.value)}
                    className="no-number-spinner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none flex-1 h-10 px-3 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-bold text-slate-900 tabular-nums focus:outline-none focus:bg-white focus:border-blue-500/60"
                  />
                  <button
                    type="button"
                    disabled={jamaBusy}
                    onClick={async () => {
                      const amt = Number(jamaAmount) || currentMember.cashInHand;
                      if (amt > 0 && !jamaBusy) {
                        setJamaBusy(true);
                        try {
                          await requestCashHandover(amt);
                          setJamaAmount('');
                        } finally {
                          setJamaBusy(false);
                        }
                      }
                    }}
                    className="h-10 px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white text-xs font-extrabold whitespace-nowrap shadow-xs shadow-blue-600/20 transition-all touch-manipulation"
                  >
                    {jamaBusy ? 'Sending...' : 'Request Jama'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-[0_4px_16px_-6px_rgba(15,23,42,0.05)]">
              {collectorRows.map(({ member, count, totalCollected }) => {
                const initials = member.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={member.uid}
                    className="px-4 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-blue-500/12 text-blue-800 text-xs font-extrabold flex items-center justify-center shrink-0">
                        {initials || 'M'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold text-slate-900 truncate">
                            {member.name}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                            {member.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums truncate">
                          {count} receipts · Cash in hand:{' '}
                          <strong className="text-amber-800">
                            {formatINR(member.cashInHand, privacyMasked)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-emerald-600 tabular-nums">
                        {formatINR(totalCollected, privacyMasked)}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">collected</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {breakdownTab === 'mode' && (
          <div key="tab-mode" className="animate-report-step space-y-2.5">
            {byModeRows.map((row) => {
              const dotColor =
                row.mode === 'UPI'
                  ? 'bg-blue-600'
                  : row.mode === 'CASH'
                  ? 'bg-amber-500'
                  : 'bg-sky-500';

              return (
                <div
                  key={row.mode}
                  className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 flex items-center justify-between gap-3 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.05)]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                      <span className="text-sm font-extrabold text-slate-900">{row.mode}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                      In:{' '}
                      <strong className="text-emerald-700">
                        {formatINR(row.inflow, privacyMasked)}
                      </strong>{' '}
                      · Out:{' '}
                      <strong className="text-red-600">
                        {formatINR(row.outflow, privacyMasked)}
                      </strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900 tabular-nums">
                      {formatINR(row.net, privacyMasked)}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400">net balance</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {breakdownTab === 'audit' && (
          <div key="tab-audit" className="animate-report-step space-y-2.5">
            {auditLogs.length === 0 ? (
              <div className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-8 text-center text-xs text-slate-500 shadow-xs">
                No audit events recorded yet.
              </div>
            ) : (
              <div className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-xs">
                {auditLogs.slice(0, 60).map((log) => (
                  <div key={log.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{log.summary}</p>
                    <p className="text-[11px] text-slate-500">By: {log.performedByName}</p>
                    {(log.beforeData || log.afterData) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                        {log.beforeData && (
                          <div className="rounded-lg bg-rose-50/70 border border-rose-200/70 px-2.5 py-1.5 text-rose-900 break-all">
                            <span className="font-bold uppercase">Before: </span>
                            {log.beforeData}
                          </div>
                        )}
                        {log.afterData && (
                          <div className="rounded-lg bg-blue-50/70 border border-blue-200/70 px-2.5 py-1.5 text-blue-900 break-all">
                            <span className="font-bold uppercase">After: </span>
                            {log.afterData}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Full-Screen Shareable Hisab Summary Poster View */}
      {showPosterModal && (
        <div className="fixed inset-0 z-50 bg-[#F5F7FB] text-slate-900 flex flex-col w-full h-[100dvh] overflow-hidden">
          <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-[#F5F7FB]/90 backdrop-blur-xl border-b border-slate-200/80 shrink-0">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Hisab Summary Poster</h2>
              <p className="text-xs text-slate-500">
                {activeUtsav.name} ({activeUtsav.yearCycle})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPosterModal(false)}
              className="w-10 h-10 rounded-full bg-white border border-slate-200/90 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
            <div className="max-w-xl mx-auto space-y-4">
              <div
                ref={posterRef}
                className="rounded-2xl bg-[#FFFDF9] border-2 border-blue-600/85 p-5 space-y-4 text-slate-900 shadow-xs"
              >
                <div className="text-center space-y-1">
                  <p className="font-devanagari text-xs font-bold text-amber-800">
                    || श्री गणेशाय नमः ||
                  </p>
                  <img
                    src={resolveMandalLogoUrl(mandal.logoUrl)}
                    alt={mandal.name}
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith(MANDAL_DEFAULT_EMBLEM)) {
                        e.currentTarget.src = MANDAL_DEFAULT_EMBLEM;
                      }
                    }}
                    className="w-14 h-14 rounded-full object-cover mx-auto border-2 border-blue-600/35 bg-blue-50"
                    referrerPolicy="no-referrer"
                  />
                  <h2 className="text-lg font-extrabold text-slate-900">{mandal.name}</h2>
                  <p className="text-xs font-semibold text-slate-500">
                    {activeUtsav.name} ({activeUtsav.yearCycle}) · {dateLabelMap[datePreset]}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-2.5">
                    <div className="text-[10px] font-extrabold text-emerald-800 uppercase">
                      Collected
                    </div>
                    <div className="text-sm font-extrabold text-emerald-700 tabular-nums mt-0.5">
                      {formatINR(summary.collected)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-red-50 border border-red-200/80 p-2.5">
                    <div className="text-[10px] font-extrabold text-red-800 uppercase">Spent</div>
                    <div className="text-sm font-extrabold text-red-600 tabular-nums mt-0.5">
                      {formatINR(summary.spent)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-2.5">
                    <div className="text-[10px] font-extrabold text-amber-900 uppercase">Balance</div>
                    <div className="text-sm font-extrabold text-amber-900 tabular-nums mt-0.5">
                      {formatINR(summary.inHand)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-blue-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mandal ka hisaab, sabke saamne · Verified on UtsavBook</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPoster}
                  className="flex-1 h-11 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-xs shadow-blue-600/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Poster JPEG</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsAppSummary}
                  className="flex-1 h-11 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200/90 text-blue-800 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <span>Share WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Import PDF / Excel Ledger View */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-[#F5F7FB] text-slate-900 flex flex-col w-full h-[100dvh] overflow-hidden">
          <header className="sticky top-0 z-20 flex items-start justify-between gap-2 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-[#F5F7FB]/90 backdrop-blur-xl border-b border-slate-200/80 shrink-0">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Import PDF or Excel Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Upload .pdf, .xlsx, .xls, or .csv to preview and add entries to {activeUtsav.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowImportModal(false);
                resetImportModalState();
              }}
              aria-label="Close import view"
              className="w-10 h-10 rounded-full bg-white border border-slate-200/90 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90 transition-all shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6 py-4 max-w-4xl w-full mx-auto space-y-3.5">

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleImportFileChange}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsingImport || savingImport}
                title={
                  parsingImport
                    ? 'Reading file...'
                    : importFileName
                    ? `Change File (${importFileName})`
                    : 'Choose PDF or Excel / CSV File'
                }
                className="w-full sm:w-auto sm:flex-1 min-w-0 h-11 px-4 rounded-xl overflow-hidden bg-[#2563EB] hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 shadow-xs shadow-blue-600/20 disabled:opacity-60 transition-all"
              >
                {parsingImport ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Upload className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">
                  {parsingImport
                    ? 'Reading file...'
                    : importFileName
                    ? `Change File (${importFileName})`
                    : 'Choose PDF or Excel / CSV File'}
                </span>
              </button>
              <button
                type="button"
                onClick={downloadImportTemplateExcel}
                className="w-full sm:w-auto h-11 px-3.5 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200/90 text-xs font-bold text-slate-800 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Sample Template (.xlsx)</span>
              </button>
            </div>

            {importError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200/80 p-3 flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {importWarnings.length > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3 flex items-start gap-2 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-0.5">
                  {importWarnings.map((w, idx) => (
                    <div key={idx}>{w}</div>
                  ))}
                </div>
              </div>
            )}

            {!parsingImport && importRows.length === 0 && !importError && (
              <div className="rounded-2xl bg-white/95 border border-slate-200/90 p-6 text-center space-y-2">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-xs font-extrabold text-slate-900">
                  Supports MandalBook PDF statements & Excel/CSV sheets
                </div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                  Expected columns for spreadsheets: Date, Type (Income/Expense), Donor / Title,
                  Head / Category, Amount, Payment Mode (UPI/CASH/BANK). You can review and edit
                  every row before saving.
                </p>
              </div>
            )}

            {importRows.length > 0 && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-2xl border border-slate-200/90 px-3.5 py-2.5">
                  <div className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-900">
                    <SlidingSwitch
                      ariaLabel="Select all imported rows"
                      checked={allRowsSelected}
                      onChange={(checked) =>
                        setImportRows((prev) => prev.map((r) => ({ ...r, selected: checked })))
                      }
                      tone="blue"
                    />
                    <span>
                      {selectedImportRows.length} of {importRows.length} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-extrabold tabular-nums">
                    <span className="text-emerald-700">+{formatINR(selectedIncomeSum)}</span>
                    <span className="text-red-600">−{formatINR(selectedExpenseSum)}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {importRows.map((row) => (
                    <div
                      key={row.id}
                      className={`rounded-2xl border p-3 space-y-2 transition-all ${
                        row.selected
                          ? 'bg-white border-slate-200/90 shadow-2xs'
                          : 'bg-slate-100/70 border-slate-200/60 opacity-65'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) =>
                              updateImportRow(row.id, { selected: e.target.checked })
                            }
                            className="rounded border-slate-300 accent-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextType = row.type === 'income' ? 'expense' : 'income';
                              updateImportRow(row.id, {
                                type: nextType,
                                head:
                                  nextType === 'income'
                                    ? INCOME_HEADS[0]
                                    : EXPENSE_HEADS[EXPENSE_HEADS.length - 1],
                                paymentMode: row.paymentMode === 'GOODS' ? 'CASH' : row.paymentMode,
                              });
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              row.type === 'income'
                                ? 'bg-blue-50 border border-blue-200/80 text-blue-700'
                                : row.type === 'expense'
                                ? 'bg-rose-50 border border-rose-200/80 text-rose-700'
                                : 'bg-amber-50 border border-amber-200/80 text-amber-800'
                            }`}
                          >
                            {row.type}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeImportRow(row.id)}
                          aria-label="Remove row"
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={row.titleOrDonorName}
                          onChange={(e) =>
                            updateImportRow(row.id, { titleOrDonorName: e.target.value })
                          }
                          placeholder="Donor or Expense Title"
                          className="sm:col-span-5 h-9 px-2.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={row.head}
                          onChange={(e) => updateImportRow(row.id, { head: e.target.value })}
                          placeholder="Head / Category"
                          className="sm:col-span-3 h-9 px-2.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          value={row.amount}
                          onChange={(e) =>
                            updateImportRow(row.id, { amount: Number(e.target.value) || 0 })
                          }
                          className="no-number-spinner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none sm:col-span-2 h-9 px-2.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-extrabold tabular-nums text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                        />
                        <select
                          value={row.paymentMode}
                          onChange={(e) =>
                            updateImportRow(row.id, {
                              paymentMode: e.target.value as PaymentMode,
                            })
                          }
                          className="sm:col-span-2 h-9 px-2 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                        >
                          <option value="UPI">UPI</option>
                          <option value="CASH">CASH</option>
                          <option value="BANK">BANK</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="date"
                          value={row.entryDate}
                          onChange={(e) => updateImportRow(row.id, { entryDate: e.target.value })}
                          className="h-8 px-2 rounded-lg bg-[#F5F7FB] border border-slate-200/90 text-[11px] font-medium text-slate-600"
                        />
                        {row.flatOrAddress && (
                          <span className="text-[11px] text-slate-500 truncate">
                            {row.flatOrAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  resetImportModalState();
                }}
                disabled={savingImport}
                className="flex-1 h-11 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200/90 text-xs font-bold text-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedImportRows.length === 0 || savingImport}
                className="flex-1 h-11 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-xs shadow-blue-600/20 disabled:opacity-50 transition-all"
              >
                {savingImport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>
                    Import {selectedImportRows.length}{' '}
                    {selectedImportRows.length === 1 ? 'Entry' : 'Entries'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}