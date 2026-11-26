import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ChevronRight,
  Coins,
  FolderOpen,
  HelpCircle,
  History,
  Loader2,
  LogOut,
  Phone,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMandal } from '../context/MandalContext';
import { formatINR } from '../lib/i18n';
import { MANDAL_DEFAULT_EMBLEM, resolveMandalLogoUrl } from '../types';

export function MandalHubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    mandal,
    members,
    currentMember,
    effectiveRole,
    activeUtsav,
    auditLogs,
    documents,
    computedTotals,
    language,
    deleteAllUtsavData,
    logout,
    showToast,
    tr,
  } = useMandal();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    if (searchParams.get('store') === '1') {
      navigate('/mandal/credits', { replace: true });
    }
  }, [searchParams, navigate]);

  if (!mandal || !activeUtsav) return null;

  const handleConfirmDeleteAll = async () => {
    if (deletingAll) return;
    setDeletingAll(true);
    try {
      await deleteAllUtsavData();
      setShowDeleteConfirm(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete data', 'error');
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-full bg-[#F5F7FB] text-slate-900 overscroll-y-contain selection:bg-blue-500/15">
      <style>{`
        @keyframes hubCardReveal {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0) scale(0.988);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        .animate-hub-in {
          will-change: transform, opacity;
          animation: hubCardReveal 0.44s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Sticky Liquid-Glass App Header */}
      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/75 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[18px] font-extrabold text-slate-900 tracking-tight leading-tight">
              Mandal Hub
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {activeUtsav.name} · {activeUtsav.yearCycle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/mandal/settings')}
              aria-label="App Settings"
              className="w-9 h-9 rounded-full bg-white/95 hover:bg-slate-50 active:scale-95 border border-slate-200/90 flex items-center justify-center text-slate-700 transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/mandal/utsavs')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-slate-50 active:scale-95 border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] text-xs font-extrabold text-slate-800 shrink-0 transition-all touch-manipulation"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>{activeUtsav.yearCycle}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 pt-3.5 pb-8 space-y-4">
        {/* Top Mandal Identity Card */}
        <section
          style={{ animationDelay: '0ms' }}
          className="animate-hub-in relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 p-4 flex items-center justify-between gap-3.5 shadow-[0_10px_28px_-10px_rgba(15,23,42,0.07),inset_0_1px_0_0_rgba(255,255,255,1)]"
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
          <div className="pointer-events-none absolute -right-10 -top-10 w-32 h-32 rounded-full bg-blue-400/12 blur-2xl" />

          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={resolveMandalLogoUrl(mandal.logoUrl)}
              alt={mandal.name}
              onError={(e) => {
                if (!e.currentTarget.src.endsWith(MANDAL_DEFAULT_EMBLEM)) {
                  e.currentTarget.src = MANDAL_DEFAULT_EMBLEM;
                }
              }}
              className="w-16 h-16 rounded-2xl object-cover bg-blue-50 ring-2 ring-blue-500/20 border border-white shrink-0 shadow-xs"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold text-slate-900 truncate">{mandal.name}</h2>
                {mandal.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-blue-600 shrink-0" aria-label="Verified" />
                )}
              </div>
              <p className="text-xs font-bold text-blue-700 mt-0.5 truncate">
                {mandal.subtitle || `${activeUtsav.name} · Est. ${mandal.estYear}`}
              </p>
              {mandal.address && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{mandal.address}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/mandal/details')}
            className="hidden sm:inline-flex h-9 px-3.5 rounded-xl bg-[#F5F7FB] hover:bg-slate-100 border border-slate-200/90 text-xs font-bold text-slate-800 shrink-0"
          >
            Edit Details
          </button>
        </section>

        {/* Grouped Pages Directory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Section 1: Mandal Management & Governance */}
          <section
            style={{ animationDelay: '70ms' }}
            className="animate-hub-in space-y-2"
          >
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400 px-1">
              Mandal &amp; Governance
            </h2>
            <div className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-[0_4px_16px_-6px_rgba(15,23,42,0.05)]">
              <MenuRow
                icon={Building2}
                label="Mandal Details & Receipt"
                sub="Branding, logo, UPI ID, QR & signature"
                onClick={() => navigate('/mandal/details')}
              />
              <MenuRow
                icon={Users}
                label="Members & Join Code"
                sub={`${members.length} members & role permissions`}
                onClick={() => navigate('/mandal/members')}
              />
              <MenuRow
                icon={Sparkles}
                label="Manage Utsav Books"
                sub={`${activeUtsav.name} · ${activeUtsav.yearCycle}`}
                onClick={() => navigate('/mandal/utsavs')}
              />
              <MenuRow
                icon={FolderOpen}
                label="Documents Vault"
                sub={`${documents.length} permissions, NOCs & bills`}
                onClick={() => navigate('/mandal/documents')}
              />
              <MenuRow
                icon={History}
                label="Audit Log & Voided Recovery"
                sub={`${auditLogs.length} immutable events`}
                onClick={() => navigate('/mandal/audit')}
              />
              <MenuRow
                icon={Coins}
                accent="blue"
                label="WhatsApp Receipt Packs"
                sub={`${mandal.whatsapp_credits ?? mandal.whatsappCredits} credits remaining`}
                onClick={() => navigate('/mandal/credits')}
              />
            </div>
          </section>

          {/* Section 2: App Settings & Support */}
          <section
            style={{ animationDelay: '115ms' }}
            className="animate-hub-in space-y-2"
          >
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400 px-1">
              Settings &amp; Support
            </h2>
            <div className="bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-[0_4px_16px_-6px_rgba(15,23,42,0.05)]">
              <MenuRow
                icon={Settings}
                accent="slate"
                label="App Settings (Language, PWA & Roles)"
                sub={language === 'en' ? 'English' : language === 'mr' ? 'मराठी' : 'हिन्दी'}
                onClick={() => navigate('/mandal/settings')}
              />
              <MenuRow
                icon={BadgeCheck}
                accent="blue"
                label="UtsavBook Features & Verification"
                sub="Transparency & receipt standards"
                onClick={() => navigate('/mandal/features')}
              />
              <MenuRow
                icon={Phone}
                accent="slate"
                label="Committee Contacts"
                sub="Quick call & WhatsApp directory"
                onClick={() => navigate('/mandal/contacts')}
              />
              <MenuRow
                icon={HelpCircle}
                accent="slate"
                label="Help, FAQs & Privacy / Terms"
                sub="Receipt credit rules & data protection"
                onClick={() => navigate('/mandal/help')}
              />
            </div>
          </section>
        </div>

        {/* YOU Profile Card & Logout */}
        <div
          style={{ animationDelay: '210ms' }}
          className="animate-hub-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 flex items-center justify-between gap-3 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.05)]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-blue-500/15 text-blue-800 flex items-center justify-center font-extrabold text-sm shrink-0">
              {(currentMember?.name || 'A').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800">
                  YOU
                </span>
                <span className="text-sm font-extrabold text-slate-900 truncate">
                  {currentMember?.name || 'Mandal Admin'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 capitalize mt-0.5 truncate">
                Role: {effectiveRole} · {currentMember?.phone || currentMember?.email || 'Active'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            className="h-10 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 border border-rose-200/80 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-all touch-manipulation"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{tr('logout')}</span>
          </button>
        </div>

        {/* Bottom Full-Width Delete All Data Action */}
        <div
          style={{ animationDelay: '240ms' }}
          className="animate-hub-in"
        >
          <button
            type="button"
            disabled={effectiveRole !== 'admin' || deletingAll}
            onClick={() => {
              if (effectiveRole !== 'admin') {
                showToast('Only Mandal Admin can delete all data.', 'error');
                return;
              }
              setShowDeleteConfirm(true);
            }}
            className="w-full h-11 px-4 rounded-2xl bg-rose-50/95 hover:bg-rose-100/90 active:scale-[0.98] disabled:opacity-50 border border-rose-200/90 text-xs font-extrabold text-rose-600 inline-flex items-center justify-center gap-2 shadow-[0_4px_14px_-6px_rgba(225,29,72,0.16),inset_0_1px_0_0_rgba(255,255,255,0.95)] transition-all touch-manipulation"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Delete All Data (Collected, Spend, In Hand)</span>
          </button>
        </div>

        {/* Official UtsavBook Brand Footer */}
        <div className="pt-2 pb-1 flex items-center justify-center gap-2 opacity-75">
          <img
            src="/logo-icon.png"
            alt="UtsavBook"
            className="w-5 h-5 rounded-md object-contain mix-blend-multiply"
          />
          <img src="/logo-text.png" alt="UtsavBook" className="h-3.5 w-auto object-contain" />
        </div>
      </main>

      {/* Confirmation Modal for Deleting All Ledger Data */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Delete All Data?</h2>
                  <p className="text-xs text-slate-500">
                    {activeUtsav.name} · {activeUtsav.yearCycle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={deletingAll}
                onClick={() => setShowDeleteConfirm(false)}
                aria-label="Close confirmation"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 inline-flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-rose-50/70 border border-rose-200/80 p-3.5 space-y-2 text-xs text-rose-950">
              <p className="font-semibold leading-relaxed">
                This will permanently delete all income, expense, and goods entries for{' '}
                <strong>{activeUtsav.name}</strong> and reset Collected, Spend, and In Hand to{' '}
                <strong>₹0</strong>.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center tabular-nums">
                <div className="rounded-xl bg-white/90 border border-rose-200/70 p-2">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Collected</div>
                  <div className="text-xs font-extrabold text-emerald-700 mt-0.5 truncate">
                    {formatINR(computedTotals.collected)}
                  </div>
                </div>
                <div className="rounded-xl bg-white/90 border border-rose-200/70 p-2">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Spent</div>
                  <div className="text-xs font-extrabold text-red-600 mt-0.5 truncate">
                    {formatINR(computedTotals.spent)}
                  </div>
                </div>
                <div className="rounded-xl bg-white/90 border border-rose-200/70 p-2">
                  <div className="text-[10px] font-bold uppercase text-slate-500">In Hand</div>
                  <div className="text-xs font-extrabold text-slate-900 mt-0.5 truncate">
                    {formatINR(computedTotals.balance)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={deletingAll}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-bold text-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAll}
                onClick={handleConfirmDeleteAll}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-xs shadow-rose-600/25 transition-all"
              >
                {deletingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  sub,
  accent = 'blue',
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub?: string;
  accent?: 'blue' | 'amber' | 'rose' | 'slate';
  onClick: () => void;
}) {
  const badgeStyles =
    accent === 'amber'
      ? 'bg-amber-50 border-amber-200/80 text-amber-700'
      : accent === 'rose'
      ? 'bg-rose-50 border-rose-200/80 text-rose-600'
      : accent === 'slate'
      ? 'bg-slate-100 border-slate-200/80 text-slate-600'
      : 'bg-blue-50 border-blue-200/80 text-blue-700';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full px-4 py-3.5 min-h-[58px] flex items-center justify-between gap-3 text-left hover:bg-slate-50/90 active:bg-slate-100/80 transition-colors touch-manipulation"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${badgeStyles}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900 truncate">{label}</div>
          {sub && <div className="text-[11px] text-slate-500 truncate mt-0.5">{sub}</div>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
    </button>
  );
}