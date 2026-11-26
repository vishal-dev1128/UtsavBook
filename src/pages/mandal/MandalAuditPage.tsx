import {
  CheckCircle2,
  Clock,
  History,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useMandal } from '../../context/MandalContext';
import { formatINR } from '../../lib/i18n';
import { MandalSubPageShell } from './MandalSubPageShell';

const RECOVERY_WINDOW_DAYS = 30;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function formatAuditTimestamp(raw?: string | number | Date): string {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDiffPayload(payload: unknown): string | null {
  if (payload === null || payload === undefined) return null;

  let parsed: unknown = payload;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return null;
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    } else {
      return trimmed;
    }
  }

  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    );
    if (entries.length === 0) return null;
    return entries
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' · ');
  }

  return String(parsed);
}

function getActionBadgeStyle(action: string): string {
  const normalized = action.toUpperCase();
  if (normalized.includes('VOID') || normalized.includes('DELETE') || normalized.includes('REJECT')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/80';
  }
  if (normalized.includes('RESTORE') || normalized.includes('APPROVE') || normalized.includes('CREATE') || normalized.includes('ADD')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
  }
  if (normalized.includes('HANDOVER') || normalized.includes('UPDATE') || normalized.includes('EDIT')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/80';
  }
  return 'bg-blue-50 text-blue-700 border-blue-200/80';
}

function getRecoveryMeta(voidedAt?: string) {
  if (!voidedAt) {
    return { expired: false, daysLeft: null as number | null };
  }
  const voidTime = new Date(voidedAt).getTime();
  if (Number.isNaN(voidTime)) {
    return { expired: false, daysLeft: null as number | null };
  }
  const elapsedDays = Math.floor((Date.now() - voidTime) / MS_PER_DAY);
  const daysLeft = Math.max(0, RECOVERY_WINDOW_DAYS - elapsedDays);
  return {
    expired: elapsedDays > RECOVERY_WINDOW_DAYS,
    daysLeft,
  };
}

type AuditFilter = 'all' | 'void' | 'create' | 'update';

export function MandalAuditPage() {
  const { entries = [], auditLogs = [], restoreEntry, effectiveRole } = useMandal();
  const isAdmin = effectiveRole === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<AuditFilter>('all');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoredBanner, setRestoredBanner] = useState<string | null>(null);

  const voidedEntries = useMemo(
    () =>
      entries
        .filter((e) => e.isVoided)
        .map((e) => {
          const voidedAt = (e as { voidedAt?: string }).voidedAt;
          return {
            entry: e,
            ...getRecoveryMeta(voidedAt),
          };
        }),
    [entries],
  );

  const sortedAndFilteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return [...auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((log) => {
        const actionUpper = (log.action || '').toUpperCase();

        if (activeFilter === 'void' && !actionUpper.includes('VOID') && !actionUpper.includes('RESTORE')) {
          return false;
        }
        if (activeFilter === 'create' && !actionUpper.includes('CREATE') && !actionUpper.includes('ADD')) {
          return false;
        }
        if (
          activeFilter === 'update' &&
          !actionUpper.includes('UPDATE') &&
          !actionUpper.includes('EDIT') &&
          !actionUpper.includes('HANDOVER') &&
          !actionUpper.includes('APPROVE')
        ) {
          return false;
        }

        if (!q) return true;
        return (
          (log.summary || '').toLowerCase().includes(q) ||
          (log.performedByName || '').toLowerCase().includes(q) ||
          actionUpper.toLowerCase().includes(q)
        );
      });
  }, [auditLogs, searchQuery, activeFilter]);

  const handleRestore = async (id: string, title: string) => {
    if (!isAdmin || restoringId) return;
    setRestoringId(id);
    try {
      await Promise.resolve(restoreEntry(id));
      setRestoredBanner(`"${title}" restored to active ledger.`);
      window.setTimeout(() => {
        setRestoredBanner((prev) => (prev?.includes(title) ? null : prev));
      }, 3500);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <MandalSubPageShell
      title="Audit Log & 30d Recovery"
      subtitle={`${auditLogs.length} immutable activity records`}
    >
      <div className="space-y-4 pb-24">
        {/* Restore Success Feedback Banner */}
        {restoredBanner && (
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-bold text-emerald-800 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{restoredBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setRestoredBanner(null)}
              aria-label="Dismiss message"
              className="text-emerald-600 hover:text-emerald-900 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Voided Entries (30-Day Restore Window) */}
        {voidedEntries.length > 0 && (
          <div
            style={{ animationDelay: '0ms' }}
            className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-rose-200/90 p-4 space-y-2.5 shadow-[0_4px_16px_-6px_rgba(225,29,72,0.08)]"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-rose-600">
                Voided Entries (30-Day Restore Window)
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/70 tabular-nums">
                {voidedEntries.length}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {voidedEntries.map(({ entry: e, expired, daysLeft }) => {
                const isRestoring = restoringId === e.id;
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-0.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">
                          {e.titleOrDonorName || 'Untitled Entry'}
                        </span>
                        {daysLeft !== null && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums ${
                              expired
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {expired ? 'Expired' : `${daysLeft}d left`}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums truncate mt-0.5">
                        {formatINR(e.amount)} · {e.head || 'General'}
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        disabled={expired || isRestoring}
                        onClick={() => handleRestore(e.id, e.titleOrDonorName || 'Entry')}
                        className="h-9 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 disabled:opacity-50 disabled:pointer-events-none border border-blue-200/80 text-blue-700 font-bold inline-flex items-center gap-1.5 shrink-0 transition-all"
                      >
                        <RotateCcw
                          className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`}
                        />
                        <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        {auditLogs.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by member, action, or summary..."
                className="w-full h-10 pl-9 pr-8 rounded-2xl bg-white/95 border border-slate-200/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: 'All Logs' },
                  { id: 'void', label: 'Void / Restore' },
                  { id: 'create', label: 'Created' },
                  { id: 'update', label: 'Updates & Handover' },
                ] as const
              ).map((tab) => {
                const active = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'bg-white/90 text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Audit Trail List */}
        {auditLogs.length === 0 ? (
          <div
            style={{ animationDelay: '45ms' }}
            className="animate-page-in bg-white/95 rounded-[24px] border border-slate-200/90 p-8 text-center space-y-2"
          >
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              Audit activity will appear here as entries and handovers are recorded.
            </p>
          </div>
        ) : sortedAndFilteredLogs.length === 0 ? (
          <div className="bg-white/95 rounded-[24px] border border-slate-200/90 p-6 text-center space-y-1.5">
            <p className="text-xs font-bold text-slate-700">No matching audit records</p>
            <p className="text-[11px] text-slate-500">
              Try clearing the search query or switching filter tabs.
            </p>
          </div>
        ) : (
          <div
            style={{ animationDelay: '45ms' }}
            className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
          >
            {sortedAndFilteredLogs.map((log) => {
              const beforeText = formatDiffPayload(log.beforeData);
              const afterText = formatDiffPayload(log.afterData);

              return (
                <div key={log.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getActionBadgeStyle(
                        log.action || 'LOG',
                      )}`}
                    >
                      {log.action || 'ACTIVITY'}
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                      {formatAuditTimestamp(log.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-900 pt-0.5 leading-snug">
                    {log.summary}
                  </p>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>By: {log.performedByName || 'System'}</span>
                  </div>

                  {(beforeText || afterText) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[10.5px] font-mono">
                      {beforeText && (
                        <div className="rounded-xl bg-rose-50/70 border border-rose-200/70 px-2.5 py-1.5 text-rose-900 break-words">
                          <span className="font-bold uppercase">Before: </span>
                          {beforeText}
                        </div>
                      )}
                      {afterText && (
                        <div className="rounded-xl bg-blue-50/70 border border-blue-200/70 px-2.5 py-1.5 text-blue-900 break-words">
                          <span className="font-bold uppercase">After: </span>
                          {afterText}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MandalSubPageShell>
  );
}