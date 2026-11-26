import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Lock,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useMandal } from '../../context/MandalContext';
import { formatINR } from '../../lib/i18n';
import { Utsav } from '../../types';
import { MandalSubPageShell } from './MandalSubPageShell';

const UTSAV_PRESETS = [
  'Ganeshotsav',
  'Navratri',
  'Shiv Jayanti',
  'Dahi Handi',
  'Society Maintenance',
] as const;

export function MandalUtsavsPage() {
  const {
    utsavs = [],
    activeUtsav,
    setActiveUtsavId,
    createUtsav,
    deleteUtsav,
    effectiveRole,
    showToast,
  } = useMandal();

  const [newUtsavName, setNewUtsavName] = useState('Ganeshotsav');
  const [newUtsavYear, setNewUtsavYear] = useState('2027-28');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Utsav | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = effectiveRole === 'admin';

  const sortedUtsavs = useMemo(
    () =>
      [...utsavs].sort((a, b) =>
        (b.yearCycle || '').localeCompare(a.yearCycle || '', undefined, {
          numeric: true,
        }),
      ),
    [utsavs],
  );

  const isDuplicate = useMemo(() => {
    const nameNorm = newUtsavName.trim().toLowerCase();
    const yearNorm = newUtsavYear.trim().toLowerCase();
    if (!nameNorm || !yearNorm) return false;

    return utsavs.some(
      (u) =>
        (u.name || '').trim().toLowerCase() === nameNorm &&
        (u.yearCycle || '').trim().toLowerCase() === yearNorm,
    );
  }, [utsavs, newUtsavName, newUtsavYear]);

  const trimmedName = newUtsavName.trim();
  const trimmedYear = newUtsavYear.trim();
  const canCreate = isAdmin && !creating && trimmedName.length > 0 && trimmedYear.length > 0 && !isDuplicate;
  const canDeleteBooks = isAdmin && sortedUtsavs.length > 1;

  const handleSelectUtsav = (id: string, name: string, yearCycle: string) => {
    if (activeUtsav?.id === id) return;
    setActiveUtsavId(id);
    showToast(`Switched to ${name} (${yearCycle})`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;

    setCreating(true);
    try {
      await createUtsav(trimmedName, trimmedYear);
      showToast(`Created & switched to ${trimmedName} (${trimmedYear})`);
    } catch (err) {
      showToast(
        err instanceof Error && err.message
          ? err.message
          : 'Failed to create Utsav book. Please try again.',
        'error',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting || !canDeleteBooks) return;
    setDeleting(true);
    try {
      await deleteUtsav(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      showToast(
        err instanceof Error && err.message
          ? err.message
          : 'Failed to delete Utsav book. Please try again.',
        'error',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MandalSubPageShell
      title="Manage Utsav Books"
      subtitle="Switch festival ledgers, start a new cycle, or delete old books"
    >
      {/* Utsav Books List */}
      {sortedUtsavs.length === 0 ? (
        <div
          style={{ animationDelay: '0ms' }}
          className="animate-page-in bg-white/95 rounded-[24px] border border-slate-200/90 p-8 text-center space-y-2"
        >
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-500">
            No Utsav books created yet. Start your first festival ledger below.
          </p>
        </div>
      ) : (
        <div
          style={{ animationDelay: '0ms' }}
          className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
        >
          {sortedUtsavs.map((u) => {
            const isSelected = activeUtsav?.id === u.id;
            const collected = u.totalCollected ?? 0;
            const spent = u.totalSpent ?? 0;
            const net = collected - spent;

            return (
              <div
                key={u.id}
                className={`w-full p-4 flex items-center justify-between gap-2.5 transition-colors ${
                  isSelected
                    ? 'bg-blue-50/45'
                    : 'hover:bg-slate-50/90'
                }`}
              >
                <button
                  type="button"
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => handleSelectUtsav(u.id, u.name, u.yearCycle)}
                  className="min-w-0 flex-1 flex items-center justify-between gap-3 text-left cursor-pointer touch-manipulation"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900">
                        {u.name} ({u.yearCycle})
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                      Collected{' '}
                      <strong className="text-emerald-700">{formatINR(collected)}</strong> · Spent{' '}
                      <strong className="text-rose-600">{formatINR(spent)}</strong> · Net{' '}
                      <strong className={net < 0 ? 'text-rose-700' : 'text-slate-900'}>
                        {formatINR(net)}
                      </strong>
                    </div>
                  </div>

                  {!isSelected && (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    disabled={!canDeleteBooks}
                    onClick={() => setDeleteTarget(u)}
                    title={
                      canDeleteBooks
                        ? `Delete ${u.name} (${u.yearCycle})`
                        : 'Keep at least 1 Utsav book'
                    }
                    aria-label={`Delete ${u.name} (${u.yearCycle})`}
                    className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 disabled:opacity-35 disabled:pointer-events-none border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0 transition-all cursor-pointer touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create New Utsav Book Form */}
      {isAdmin ? (
        <form
          onSubmit={handleCreate}
          style={{ animationDelay: '50ms' }}
          className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 sm:p-5 space-y-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
        >
          <h3 className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
            Start New Utsav / Year Cycle
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {UTSAV_PRESETS.map((preset) => {
              const isPresetActive =
                trimmedName.toLowerCase() === preset.toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewUtsavName(preset)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                    isPresetActive
                      ? 'bg-blue-50 border-blue-400 text-blue-800'
                      : 'bg-[#F5F7FB] border-slate-200 text-slate-700 hover:border-blue-300'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="sr-only" htmlFor="utsav-name-input">
                Festival or Event Name
              </label>
              <input
                id="utsav-name-input"
                type="text"
                required
                maxLength={50}
                value={newUtsavName}
                onChange={(e) => setNewUtsavName(e.target.value)}
                placeholder="Festival / Event Name"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div>
              <label className="sr-only" htmlFor="utsav-year-input">
                Year Cycle
              </label>
              <input
                id="utsav-year-input"
                type="text"
                required
                maxLength={12}
                value={newUtsavYear}
                onChange={(e) =>
                  setNewUtsavYear(e.target.value.replace(/[^0-9-/]/g, ''))
                }
                placeholder="2027-28"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-bold text-slate-900 tabular-nums focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          {isDuplicate && (
            <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-2 text-[11px] font-bold text-amber-900">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                “{trimmedName} ({trimmedYear})” already exists in your Utsav books.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canCreate}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-extrabold shadow-xs shadow-blue-600/20 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{creating ? 'Creating Utsav Book...' : 'Create Utsav Book'}</span>
          </button>
        </form>
      ) : (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/80 px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-amber-900">
          <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>Only Admin / Treasurer can create or delete an Utsav book.</span>
        </div>
      )}

      {/* Delete Utsav Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete Utsav Book"
          onClick={() => {
            if (!deleting) setDeleteTarget(null);
          }}
          className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[28px] bg-white border border-slate-200/90 shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Delete Utsav Book?
                  </h3>
                  <p className="text-xs font-bold text-rose-700 truncate mt-0.5">
                    {deleteTarget.name} ({deleteTarget.yearCycle})
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-rose-50/70 border border-rose-200/70 p-3 text-xs text-rose-950 leading-relaxed space-y-1">
              <p className="font-semibold">
                This will permanently delete <strong>{deleteTarget.name}</strong> along with all its
                Vargani receipts, expenses, vendors, and handovers.
              </p>
              <p className="text-[11px] text-rose-800">
                Collected: <strong>{formatINR(deleteTarget.totalCollected ?? 0)}</strong> · Spent:{' '}
                <strong>{formatINR(deleteTarget.totalSpent ?? 0)}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-xs shadow-rose-600/25 cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Delete Forever'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </MandalSubPageShell>
  );
}