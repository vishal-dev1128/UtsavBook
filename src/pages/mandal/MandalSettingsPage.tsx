import {
  Building2,
  Check,
  ChevronRight,
  Globe,
  HelpCircle,
  History,
  Lock,
  LogOut,
  Shield,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PWAInstallButton } from '../../components/PWAInstallButton';
import { SlidingSwitch } from '../../components/SlidingControls';
import { WhatsAppWalletCard } from '../../components/WhatsAppWalletCard';
import { useMandal } from '../../context/MandalContext';
import { Language, MemberRole } from '../../types';
import { MandalSubPageShell } from './MandalSubPageShell';

const LANGUAGE_OPTIONS: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'mr', label: 'मराठी' },
  { id: 'hi', label: 'हिन्दी' },
];

const ROLE_OPTIONS: MemberRole[] = ['admin', 'collector', 'auditor'];

export function MandalSettingsPage() {
  const navigate = useNavigate();
  const {
    mandal,
    currentMember,
    effectiveRole,
    simulatedRole,
    setSimulatedRole,
    updateMandalSettings,
    language,
    setLanguage,
    logout,
    tr,
  } = useMandal();

  const [togglingPublic, setTogglingPublic] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!mandal) return null;

  const isAdmin = effectiveRole === 'admin';
  const activeLangIdx = Math.max(
    0,
    LANGUAGE_OPTIONS.findIndex((l) => l.id === language),
  );
  const activeRoleIdx = Math.max(
    0,
    ROLE_OPTIONS.indexOf((simulatedRole || 'admin') as MemberRole),
  );

  const handleTogglePublicDonors = async (nextValue: boolean) => {
    if (!isAdmin || togglingPublic) return;
    setTogglingPublic(true);
    try {
      await Promise.resolve(updateMandalSettings({ showDonorsPublic: nextValue }));
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <MandalSubPageShell
      title="Settings & Preferences"
      subtitle="Language, WhatsApp wallet, PWA install, privacy & role access controls"
    >
      <div className="space-y-4 pb-24">
        {/* WhatsApp Receipt Wallet & Recharge History */}
        <div style={{ animationDelay: '0ms' }} className="animate-page-in">
          <WhatsAppWalletCard
            onOpenPurchaseModal={() => navigate('/mandal/credits')}
          />
        </div>

        {/* Language Switcher */}
        <div
          style={{ animationDelay: '35ms' }}
          className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 space-y-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
        >
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Globe className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{tr('language')}</span>
          </div>
          <div className="relative grid grid-cols-3 p-1 rounded-2xl bg-slate-200/75 border border-slate-200/80">
            <div
              aria-hidden="true"
              style={{
                width: 'calc((100% - 8px) / 3)',
                transform: `translate3d(${activeLangIdx * 100}%, 0, 0)`,
                willChange: 'transform',
              }}
              className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(16,24,40,0.12)] border border-slate-200/60 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
            {LANGUAGE_OPTIONS.map((item) => {
              const active = language === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLanguage(item.id)}
                  className={`relative z-10 h-10 rounded-xl text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
                    active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* PWA Install Card */}
        <div
          style={{ animationDelay: '40ms' }}
          className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 space-y-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
        >
          <div className="text-sm font-extrabold text-slate-900">Install on Phone</div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Install UtsavBook to your Home Screen for full-screen offline access during Aarti &
            door-to-door Vargani drives.
          </p>
          <PWAInstallButton />
        </div>

        {/* Public Transparency Toggle */}
        <div
          style={{ animationDelay: '80ms' }}
          onClick={() => {
            if (isAdmin && !togglingPublic) {
              handleTogglePublicDonors(!mandal.showDonorsPublic);
            }
          }}
          className={`animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 flex items-center justify-between gap-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)] ${
            isAdmin && !togglingPublic ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-extrabold text-slate-900">
                Show Donors on Public Transparency Page
              </span>
              {!isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200/80">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Admin Only</span>
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Visible at /m/{mandal.joinCode} without login (Gupt Daan always stays hidden)
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <SlidingSwitch
              ariaLabel="Show Donors on Public Transparency Page"
              disabled={!isAdmin || togglingPublic}
              checked={Boolean(mandal.showDonorsPublic)}
              onChange={handleTogglePublicDonors}
              tone="blue"
            />
          </div>
        </div>

        {/* RBAC Preview Switcher */}
        {currentMember?.role === 'admin' && (
          <div
            style={{ animationDelay: '120ms' }}
            className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 space-y-2.5 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <span>RBAC Role Preview Switcher</span>
              </div>
              {simulatedRole && simulatedRole !== 'admin' && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
                  Preview: {simulatedRole}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Test what Karyakartas (Collectors) or Auditors see without logging out.
            </p>
            <div className="relative grid grid-cols-3 p-1 rounded-2xl bg-slate-200/75 border border-slate-200/80">
              <div
                aria-hidden="true"
                style={{
                  width: 'calc((100% - 8px) / 3)',
                  transform: `translate3d(${activeRoleIdx * 100}%, 0, 0)`,
                  willChange: 'transform',
                }}
                className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(16,24,40,0.12)] border border-slate-200/60 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              />
              {ROLE_OPTIONS.map((role) => {
                const active = (simulatedRole || 'admin') === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSimulatedRole(role === 'admin' ? null : role)}
                    className={`relative z-10 h-9 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer touch-manipulation ${
                      active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Links to Related Governance Settings */}
        <div
          style={{ animationDelay: '160ms' }}
          className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
        >
          {[
            {
              to: '/mandal/details',
              icon: Building2,
              label: 'Mandal Branding & UPI Settings',
              sub: 'Edit name, logo, signature, UPI ID & QR',
            },
            {
              to: '/mandal/members',
              icon: Users,
              label: 'Committee Roles & Join Code',
              sub: 'Manage Admin, Collector & Auditor access',
            },
            {
              to: '/mandal/audit',
              icon: History,
              label: 'Audit Log & 30d Recovery',
              sub: 'Activity history & restore voided entries',
            },
            {
              to: '/mandal/help',
              icon: HelpCircle,
              label: 'Help, FAQs & Privacy Policy',
              sub: 'Credit rules & public data safety',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 active:bg-slate-100/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 truncate">{item.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{item.sub}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Profile & Logout */}
        <div
          style={{ animationDelay: '200ms' }}
          className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 flex items-center justify-between gap-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold text-slate-900 truncate">
              {currentMember?.name || 'Mandal Member'}
            </div>
            <div className="text-[11px] text-slate-500 capitalize truncate">
              Role: {effectiveRole} · {currentMember?.phone || currentMember?.email || 'Active'}
            </div>
          </div>

          {confirmLogout ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="h-10 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{loggingOut ? 'Exiting...' : 'Confirm'}</span>
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setConfirmLogout(false)}
                aria-label="Cancel logout"
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              className="h-10 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 border border-rose-200/80 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{tr('logout')}</span>
            </button>
          )}
        </div>
      </div>
    </MandalSubPageShell>
  );
}