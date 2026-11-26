import { ArrowLeft, Check, Pencil, RotateCcw, Trash2, X, ZoomIn } from 'lucide-react';
import { useState } from 'react';
import { useMandal } from '../context/MandalContext';
import { formatINR, formatReceiptDate } from '../lib/i18n';
import { LedgerEntry } from '../types';
import { BillLightboxModal } from './BillLightboxModal';
import { DigitalReceiptCard } from './DigitalReceiptCard';

export function EntryDetailModal({
  entry,
  onClose,
}: {
  entry: LedgerEntry | null;
  onClose: () => void;
}) {
  const {
    mandal,
    activeUtsav,
    utsavEntries,
    language,
    effectiveRole,
    updateEntry,
    voidEntry,
    restoreEntry,
    sendAutomatedWhatsAppReceipt,
  } = useMandal();
  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!entry || !mandal) return null;

  const liveEntry = utsavEntries.find((e) => e.id === entry.id) || entry;
  const isAdmin = effectiveRole === 'admin';

  const startEdit = () => {
    setEditAmount(String(liveEntry.amount));
    setEditTitle(liveEntry.titleOrDonorName);
    setEditNote(liveEntry.note || '');
    setEditing(true);
  };

  const saveEdit = async () => {
    await updateEntry(liveEntry.id, {
      titleOrDonorName: editTitle,
      amount: Number(editAmount) || liveEntry.amount,
      note: editNote,
    });
    setEditing(false);
    onClose();
  };

  return (
    <div className="animate-step-in fixed inset-0 z-50 bg-[#F5F7FB] text-slate-900 flex flex-col w-full h-[100dvh] overflow-hidden">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-[#F5F7FB]/90 backdrop-blur-xl border-b border-slate-200/80 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center text-slate-700 hover:bg-slate-50 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 truncate">
              {liveEntry.type === 'income'
                ? 'Donation Receipt'
                : liveEntry.type === 'expense'
                ? 'Expense Voucher'
                : 'In-Kind Goods Entry'}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {formatReceiptDate(liveEntry.entryDate)} · {liveEntry.createdByName}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-full bg-white border border-slate-200/90 flex items-center justify-center text-slate-600 hover:bg-slate-100 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 pb-10">
        <div className="animate-page-in max-w-2xl mx-auto space-y-4">
          {editing ? (
            <div className="animate-step-in bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title / Donor Name
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              {liveEntry.type !== 'goods' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="flex-1 min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="min-h-[46px] px-5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : liveEntry.type === 'income' || liveEntry.type === 'goods' ? (
            <DigitalReceiptCard
              mandal={mandal}
              utsavName={`${activeUtsav?.name || 'Ganeshotsav'} (${activeUtsav?.yearCycle || '2026-27'})`}
              entry={liveEntry}
              defaultLanguage={language}
              onResendWhatsApp={async (lang) => {
                const res = await sendAutomatedWhatsAppReceipt(liveEntry, undefined, lang);
                return res.receiptImageUrl;
              }}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/70 mb-1.5">
                    {liveEntry.head}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {liveEntry.titleOrDonorName}
                  </h3>
                  {liveEntry.flatOrAddress && (
                    <p className="text-xs text-slate-500 mt-0.5">{liveEntry.flatOrAddress}</p>
                  )}
                </div>
                {liveEntry.type === 'expense' && (
                  <div className="text-xl font-extrabold text-red-600 tabular-nums">
                    −{formatINR(liveEntry.amount)}
                  </div>
                )}
              </div>

              {liveEntry.note && (
                <p className="text-xs text-slate-700 bg-[#F5F7FB] border border-slate-200/70 p-3 rounded-xl">
                  {liveEntry.note}
                </p>
              )}

              {liveEntry.billPhotoUrl && (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block w-full rounded-2xl overflow-hidden border border-slate-200 text-left"
                >
                  <img
                    src={liveEntry.billPhotoUrl}
                    alt="Bill attachment"
                    className="w-full max-h-96 object-contain bg-[#F5F7FB]"
                  />
                  <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Tap to Zoom Bill</span>
                  </span>
                </button>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100">
                <span>Mode: {liveEntry.paymentMode}</span>
                <span>
                  Status:{' '}
                  <strong className="uppercase text-slate-900">{liveEntry.approvalStatus}</strong>
                </span>
              </div>
            </div>
          )}

          <BillLightboxModal
            imageUrl={lightboxOpen ? liveEntry.billPhotoUrl || null : null}
            title={liveEntry.titleOrDonorName}
            subtitle={`${liveEntry.head} · ${formatReceiptDate(liveEntry.entryDate)}`}
            onClose={() => setLightboxOpen(false)}
          />

          {/* Admin Audit Controls */}
          {isAdmin && !editing && (
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={startEdit}
                className="flex-1 min-h-[46px] rounded-xl bg-white border border-slate-200/90 text-xs font-bold text-slate-800 inline-flex items-center justify-center gap-1.5 hover:bg-slate-50"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Entry</span>
              </button>
              {liveEntry.isVoided ? (
                <button
                  type="button"
                  onClick={async () => {
                    await restoreEntry(liveEntry.id);
                    onClose();
                  }}
                  className="flex-1 min-h-[46px] rounded-xl bg-blue-100 text-blue-800 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Entry</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await voidEntry(liveEntry.id);
                    onClose();
                  }}
                  className="flex-1 min-h-[46px] rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Void Entry (30d Undo)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
