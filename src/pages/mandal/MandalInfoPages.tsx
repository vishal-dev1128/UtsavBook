import {
  BadgeCheck,
  Check,
  ChevronDown,
  Copy,
  FileSpreadsheet,
  Globe,
  History,
  MessageCircle,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMandal } from '../../context/MandalContext';
import { MandalSubPageShell } from './MandalSubPageShell';

function normalizeWhatsAppPhone(rawPhone?: string): string | null {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return null;

  // Handle 11-digit Indian numbers starting with 0 (e.g. 09876543210 -> 919876543210)
  const withoutLeadingZero = digits.replace(/^0+/, '');
  if (withoutLeadingZero.length === 10) {
    return `91${withoutLeadingZero}`;
  }
  return withoutLeadingZero;
}

function getRoleBadgeStyle(role?: string): string {
  const normalized = (role || '').toLowerCase();
  if (normalized === 'admin') {
    return 'bg-blue-50 text-blue-700 border-blue-200/80';
  }
  if (normalized === 'collector') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
  }
  if (normalized === 'auditor') {
    return 'bg-amber-50 text-amber-800 border-amber-200/80';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200/80';
}

export function MandalFeaturesPage() {
  const navigate = useNavigate();
  const { mandal } = useMandal();
  const [copied, setCopied] = useState(false);

  if (!mandal) return null;

  const joinCode = (mandal.joinCode || '').trim();
  const publicPath = joinCode ? `/m/${joinCode}` : '/mandal';

  const handleCopyPortalLink = async () => {
    if (!joinCode) return;
    const fullUrl = `${window.location.origin}${publicPath}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for restricted webviews
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  const featureHighlights = [
    {
      icon: QrCode,
      text: 'Ornate QR-verified digital donation receipts sent directly on WhatsApp in EN / MR / HI.',
    },
    {
      icon: History,
      text: 'Immutable audit log + 30-day soft void recovery for complete accountability.',
    },
    {
      icon: ShieldCheck,
      text: 'Collector cash-in-hand (Jama) settlement & pending bill approvals.',
    },
    {
      icon: Globe,
      text: `Public transparency portal (${publicPath}) for society members without login.`,
    },
    {
      icon: FileSpreadsheet,
      text: 'Print-ready A4 Notice Board Hisab PDF & Excel/CSV export with one click.',
    },
  ];

  return (
    <MandalSubPageShell
      title="UtsavBook Features"
      subtitle="Verification & transparency standards"
    >
      <div className="space-y-4 pb-24">
        {/* Official UtsavBook Full Brand Showcase */}
        <div
          style={{ animationDelay: '0ms' }}
          className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-5 flex flex-col items-center text-center gap-2 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
        >
          <img
            src="/logo-full.png"
            alt="UtsavBook"
            className="w-36 h-auto object-contain mix-blend-multiply"
          />
          <p className="text-xs font-semibold text-slate-500">
            Mandal ka hisaab, sabke saamne · Transparent Digital Ledger
          </p>
        </div>

        <div
          style={{ animationDelay: '50ms' }}
          className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-5 space-y-4 text-sm text-slate-700 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-blue-700 font-extrabold">
              <BadgeCheck className="w-5 h-5 shrink-0" />
              <span>Verified Mandal Status: Active</span>
            </div>
            {joinCode && (
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                {joinCode}
              </span>
            )}
          </div>

          <ul className="space-y-3 text-xs leading-relaxed text-slate-600">
            {featureHighlights.map((item, idx) => {
              const Icon = item.icon;
              return (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-[#F5F7FB] border border-slate-200/80 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="pt-0.5">{item.text}</span>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => navigate(publicPath)}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-xs shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Open Public Portal</span>
            </button>

            {joinCode && (
              <button
                type="button"
                onClick={handleCopyPortalLink}
                className="h-10 px-3.5 rounded-xl bg-[#F5F7FB] hover:bg-blue-50 active:scale-[0.98] border border-slate-200/90 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    <span>Copy Portal Link</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </MandalSubPageShell>
  );
}

export function MandalContactsPage() {
  const { members = [] } = useMandal();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'collector' | 'auditor'>('all');

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const roleLower = (m.role || '').toLowerCase();
      if (roleFilter !== 'all' && roleLower !== roleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        (m.name || '').toLowerCase().includes(q) ||
        roleLower.includes(q) ||
        (m.phone || '').toLowerCase().includes(q)
      );
    });
  }, [members, searchQuery, roleFilter]);

  return (
    <MandalSubPageShell
      title="Committee Contacts"
      subtitle={`${members.length} office ${members.length === 1 ? 'bearer' : 'bearers'} & collectors`}
    >
      <div className="space-y-3 pb-24">
        {members.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, role, or phone..."
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
                  { id: 'all', label: 'All' },
                  { id: 'admin', label: 'Admin' },
                  { id: 'collector', label: 'Collectors' },
                  { id: 'auditor', label: 'Auditors' },
                ] as const
              ).map((tab) => {
                const active = roleFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRoleFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
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

        {members.length === 0 ? (
          <div
            style={{ animationDelay: '0ms' }}
            className="animate-page-in bg-white/95 rounded-[24px] border border-slate-200/90 p-8 text-center space-y-2"
          >
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              No committee members or collectors added yet.
            </p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white/95 rounded-[24px] border border-slate-200/90 p-6 text-center space-y-1">
            <p className="text-xs font-bold text-slate-700">No matching contacts</p>
            <p className="text-[11px] text-slate-500">
              Try clearing the search query or selecting “All”.
            </p>
          </div>
        ) : (
          <div
            style={{ animationDelay: '0ms' }}
            className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
          >
            {filteredMembers.map((m) => {
              const waPhone = normalizeWhatsAppPhone(m.phone);
              const telPhone = (m.phone || '').replace(/[^\d+]/g, '');

              return (
                <div key={m.uid} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 truncate">
                        {m.name || 'Member'}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${getRoleBadgeStyle(
                          m.role,
                        )}`}
                      >
                        {m.role}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5 tabular-nums truncate">
                      {m.phone || 'Phone not added'}
                    </div>
                  </div>

                  {waPhone && telPhone ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${telPhone}`}
                        aria-label={`Call ${m.name}`}
                        className="h-9 px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs font-bold text-slate-800 inline-flex items-center gap-1 hover:bg-slate-100 active:scale-95 transition-all"
                      >
                        <Phone className="w-3.5 h-3.5 text-blue-700" />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${waPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`WhatsApp ${m.name}`}
                        className="h-9 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1 hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      No phone
                    </span>
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

export function MandalHelpPage() {
  const navigate = useNavigate();
  const { mandal } = useMandal();
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  if (!mandal) return null;

  const publicPath = mandal.joinCode ? `/m/${mandal.joinCode}` : '/mandal';

  const faqs = [
    {
      question: 'How do WhatsApp receipt credits work?',
      answer:
        'Every new Mandal starts with 5 free trial credits. Only successful WhatsApp dispatches deduct 1 credit; failed or skipped sends never deduct a credit, and purchased credits never expire.',
    },
    {
      question: 'How does Gupt Daan privacy work?',
      answer: `Donor phone numbers are never exposed on the public transparency page (${publicPath}), and entries marked Gupt Daan appear as "Gupt Daan / Anonymous" publicly while staying recorded in Admin hisab.`,
    },
    {
      question: 'Can deleted entries be recovered?',
      answer:
        'Yes. All deleted or voided entries stay recoverable for 30 days inside the Audit Log & 30d Recovery page, with complete before/after history.',
    },
    {
      question: 'What is the difference between Admin, Collector, and Auditor?',
      answer:
        'Admins manage settings, approvals, and credits; Collectors record vargani/expenses and settle collected cash (Jama); Auditors have read-only verification access to all entries and reports.',
    },
  ];

  return (
    <MandalSubPageShell
      title="Help & Privacy Policy"
      subtitle="FAQs, credit rules & data safety"
    >
      <div className="space-y-4 pb-24">
        <div
          style={{ animationDelay: '0ms' }}
          className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-5 space-y-4 text-sm text-slate-700 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
        >
          <div className="flex items-center gap-2 text-blue-700 font-extrabold">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>Frequently Asked Questions</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={faq.question} className="transition-colors">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-extrabold text-slate-900 leading-snug">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3.5 text-xs leading-relaxed text-slate-600">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => navigate('/mandal/settings')}
              className="h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] text-slate-800 text-xs font-bold transition-all cursor-pointer"
            >
              App Settings
            </button>
            <button
              type="button"
              onClick={() => navigate('/mandal/audit')}
              className="h-10 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 active:scale-[0.98] border border-blue-200 text-blue-800 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Log</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/mandal/credits')}
              className="h-10 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 active:scale-[0.98] border border-blue-200 text-blue-800 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Receipt Wallet</span>
            </button>
          </div>
        </div>
      </div>
    </MandalSubPageShell>
  );
}