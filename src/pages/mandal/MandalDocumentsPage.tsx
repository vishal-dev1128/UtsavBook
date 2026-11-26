import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useMandal } from '../../context/MandalContext';
import { compressImageFile, formatReceiptDate } from '../../lib/i18n';
import { MandalSubPageShell } from './MandalSubPageShell';

const DOCUMENT_CATEGORIES = [
  'Municipal NOC',
  'Police Permission',
  'Safety & Bijli',
  'Vendor Bill',
] as const;

function formatSafeDocDate(raw?: string | number | Date): string {
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

function getCategoryBadgeStyle(category: string): string {
  switch (category) {
    case 'Municipal NOC':
      return 'bg-blue-50 border-blue-200/80 text-blue-800';
    case 'Police Permission':
      return 'bg-indigo-50 border-indigo-200/80 text-indigo-800';
    case 'Safety & Bijli':
      return 'bg-amber-50 border-amber-200/80 text-amber-800';
    case 'Vendor Bill':
      return 'bg-emerald-50 border-emerald-200/80 text-emerald-800';
    default:
      return 'bg-slate-100 border-slate-200/80 text-slate-700';
  }
}

export function MandalDocumentsPage() {
  const { documents = [], addDocument, deleteDocument, effectiveRole } = useMandal();

  const [docTitle, setDocTitle] = useState('');
  const [docCat, setDocCat] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [docFileUrl, setDocFileUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const isAdmin = effectiveRole === 'admin';

  useEffect(() => {
    if (!previewDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewDoc(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewDoc]);

  const sortedAndFilteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return [...documents]
      .sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return (Number.isNaN(tB) ? 0 : tB) - (Number.isNaN(tA) ? 0 : tA);
      })
      .filter((d) => {
        if (selectedCategory !== 'All' && d.category !== selectedCategory) {
          return false;
        }
        if (!q) return true;
        return (
          (d.title || '').toLowerCase().includes(q) ||
          (d.category || '').toLowerCase().includes(q) ||
          (d.uploadedBy || '').toLowerCase().includes(q)
        );
      });
  }, [documents, searchQuery, selectedCategory]);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusBanner({
        type: 'error',
        message: 'Please select a valid image scan (PNG, JPG, or WebP).',
      });
      return;
    }

    try {
      const compressed = await compressImageFile(file, 720, 0.75);
      setDocFileUrl(compressed);
      setStatusBanner(null);
    } catch {
      setStatusBanner({
        type: 'error',
        message: 'Unable to process this image. Please try another file.',
      });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = docTitle.trim();
    if (!isAdmin || !trimmedTitle || saving) return;

    setSaving(true);
    setStatusBanner(null);
    try {
      await addDocument({
        title: trimmedTitle,
        category: docCat,
        fileUrl: docFileUrl,
      });
      setDocTitle('');
      setDocFileUrl(undefined);
      setStatusBanner({
        type: 'success',
        message: `"${trimmedTitle}" saved to Mandal Documents Vault.`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message:
          err instanceof Error && err.message
            ? err.message
            : 'Failed to save document. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    if (!isAdmin || deletingId) return;
    setDeletingId(id);
    setStatusBanner(null);
    try {
      await Promise.resolve(deleteDocument(id));
      setConfirmDeleteId(null);
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message:
          err instanceof Error && err.message
            ? err.message
            : 'Failed to delete document.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <MandalSubPageShell
      title="Mandal Documents Vault"
      subtitle="Municipal NOCs, police permissions & vendor bills"
    >
      <div className="space-y-4 pb-24">
        {statusBanner && (
          <div
            role="status"
            className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-bold shadow-xs ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {statusBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="truncate">{statusBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              aria-label="Dismiss notification"
              className="p-0.5 opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isAdmin && (
          <form
            onSubmit={handleUpload}
            style={{ animationDelay: '0ms' }}
            className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 sm:p-5 space-y-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
          >
            <h3 className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
              Upload Permission / Vendor Bill
            </h3>
            <input
              type="text"
              required
              placeholder="Document Title (e.g. Police Loud-Speaker NOC)"
              value={docTitle}
              onChange={(e) => {
                setDocTitle(e.target.value);
                if (statusBanner) setStatusBanner(null);
              }}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <select
                value={docCat}
                onChange={(e) => setDocCat(e.target.value)}
                className="h-11 px-3 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <label className="h-11 px-3 rounded-xl border border-dashed border-blue-400/80 bg-blue-50/40 hover:bg-blue-50 text-xs font-bold text-blue-900 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>{docFileUrl ? 'Image Attached ✓' : 'Attach Image / Scan'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFilePick}
                />
              </label>
            </div>

            {docFileUrl && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F5F7FB] border border-slate-200 px-3 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={docFileUrl}
                    alt="Attached scan preview"
                    className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                  />
                  <span className="text-xs font-bold text-slate-800 truncate">
                    Document Scan Ready
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDocFileUrl(undefined)}
                  className="text-xs font-bold text-rose-600 hover:underline shrink-0"
                >
                  Remove
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !docTitle.trim()}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-extrabold shadow-xs shadow-blue-600/20 transition-all touch-manipulation"
            >
              {saving ? 'Saving Document...' : 'Save Document'}
            </button>
          </form>
        )}

        {/* Search & Category Filter Bar */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search NOCs, permissions, or vendor bills..."
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
              {(['All', ...DOCUMENT_CATEGORIES] as const).map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'bg-white/90 text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <div
            style={{ animationDelay: '45ms' }}
            className="animate-page-in bg-white/95 rounded-[24px] border border-slate-200/90 p-8 text-center space-y-2"
          >
            <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              No Mandal permissions or documents uploaded yet.
            </p>
          </div>
        ) : sortedAndFilteredDocs.length === 0 ? (
          <div className="bg-white/95 rounded-[24px] border border-slate-200/90 p-6 text-center space-y-1.5">
            <p className="text-xs font-bold text-slate-700">No matching documents</p>
            <p className="text-[11px] text-slate-500">
              Try clearing the search query or selecting “All”.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedAndFilteredDocs.map((d, idx) => {
              const isConfirming = confirmDeleteId === d.id;
              const isDeleting = deletingId === d.id;

              return (
                <div
                  key={d.id}
                  style={{ animationDelay: `${45 + Math.min(idx, 8) * 35}ms` }}
                  className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 flex items-center justify-between gap-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {d.fileUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ title: d.title, url: d.fileUrl! })}
                        className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 hover:opacity-90 transition-opacity"
                        title="View document scan"
                      >
                        <img
                          src={d.fileUrl}
                          alt={d.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-12 h-12 rounded-xl border border-slate-200/80 bg-[#F5F7FB] text-slate-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getCategoryBadgeStyle(
                          d.category,
                        )}`}
                      >
                        {d.category}
                      </span>
                      <div className="text-sm font-extrabold text-slate-900 mt-1 truncate">
                        {d.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        By {d.uploadedBy || 'Admin'} · {formatSafeDocDate(d.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {d.fileUrl && !isConfirming && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ title: d.title, url: d.fileUrl! })}
                        aria-label={`Preview ${d.title}`}
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    {isAdmin &&
                      (isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleConfirmDelete(d.id)}
                            aria-label="Confirm delete"
                            className="h-9 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isDeleting ? '...' : 'Delete'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setConfirmDeleteId(null)}
                            aria-label="Cancel delete"
                            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(d.id)}
                          aria-label={`Delete ${d.title}`}
                          className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-90 text-rose-600 flex items-center justify-center transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Document Preview Modal */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={previewDoc.title}
          onClick={() => setPreviewDoc(null)}
          className="animate-step-in fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col"
        >
          <header
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white"
          >
            <span className="text-sm font-bold truncate">{previewDoc.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={previewDoc.url}
                download={`${previewDoc.title.replace(/[^a-zA-Z0-9-_]/g, '_') || 'document'}.jpg`}
                aria-label="Download document scan"
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                aria-label="Close preview"
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
            <img
              src={previewDoc.url}
              alt={previewDoc.title}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </MandalSubPageShell>
  );
}