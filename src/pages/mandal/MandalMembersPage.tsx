import {
  Check,
  Copy,
  MessageCircle,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useMandal } from '../../context/MandalContext';
import { buildWhatsAppInviteUrl, formatINR } from '../../lib/i18n';
import { MemberRole } from '../../types';
import { MandalSubPageShell } from './MandalSubPageShell';

const ROLE_PRIORITY: Record<string, number> = {
  admin: 1,
  collector: 2,
  auditor: 3,
};

function getInitials(name?: string): string {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'M';
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function MandalMembersPage() {
  const {
    mandal,
    members = [],
    currentMember,
    effectiveRole,
    updateMemberRole,
    showToast,
  } = useMandal();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | MemberRole>('all');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<'code' | 'link' | null>(null);

  const isAdmin = effectiveRole === 'admin';

  const sortedAndFilteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const ownerId = mandal?.ownerId;

    return [...members]
      .sort((a, b) => {
        if (a.uid === ownerId) return -1;
        if (b.uid === ownerId) return 1;
        const pA = ROLE_PRIORITY[a.role] ?? 9;
        const pB = ROLE_PRIORITY[b.role] ?? 9;
        if (pA !== pB) return pA - pB;
        return (a.name || '').localeCompare(b.name || '');
      })
      .filter((m) => {
        if (roleFilter !== 'all' && m.role !== roleFilter) {
          return false;
        }
        if (!q) return true;
        return (
          (m.name || '').toLowerCase().includes(q) ||
          (m.phone || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.role || '').toLowerCase().includes(q)
        );
      });
  }, [members, mandal?.ownerId, searchQuery, roleFilter]);

  if (!mandal) return null;

  const joinCode = (mandal.joinCode || '').trim();
  const inviteUrl = `${window.location.origin}/join/${joinCode}`;

  const copyText = async (text: string, label: string, key: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedKey(key);
    showToast(`${label} copied!`);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleRoleChange = async (uid: string, memberName: string, nextRole: MemberRole) => {
    if (!isAdmin || updatingUid) return;
    setUpdatingUid(uid);
    try {
      await Promise.resolve(updateMemberRole(uid, nextRole));
      showToast(`${memberName || 'Member'} is now ${nextRole.toUpperCase()}`);
    } catch {
      showToast('Failed to update member role. Please try again.', 'error');
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <MandalSubPageShell
      title="Members & Join Code"
      subtitle={`${members.length} committee ${members.length === 1 ? 'member' : 'members'} & volunteers`}
    >
      <div className="space-y-4 pb-24">
        {/* Invite Code & Share Card */}
        <div
          style={{ animationDelay: '0ms' }}
          className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
        >
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">Mandal Invite Code</div>
            <button
              type="button"
              onClick={() => copyText(joinCode, 'Invite code', 'code')}
              title="Tap to copy join code"
              className="mt-0.5 inline-flex items-center gap-2 group text-left cursor-pointer"
            >
              <span className="text-xl font-extrabold font-mono text-blue-700 tracking-wider">
                {joinCode}
              </span>
              <span className="w-6 h-6 rounded-lg bg-blue-50 group-hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors">
                {copiedKey === 'code' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyText(inviteUrl, 'Invite link', 'link')}
              className="h-10 px-3.5 rounded-xl bg-[#F5F7FB] hover:bg-slate-200/70 active:scale-95 border border-slate-200/90 text-xs font-bold text-slate-800 inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedKey === 'link' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                window.open(
                  buildWhatsAppInviteUrl(mandal.name, joinCode, inviteUrl),
                  '_blank',
                  'noopener,noreferrer',
                )
              }
              className="h-10 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs shadow-blue-600/20 inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Invite on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Role Permissions Guide */}
        <div
          style={{ animationDelay: '45ms' }}
          className="animate-page-in rounded-2xl bg-blue-50/70 border border-blue-200/80 px-4 py-3 flex items-start gap-2.5 text-xs text-blue-950"
        >
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Role Permissions:</strong> <strong>Admin/Treasurer</strong> controls edits,
            approvals, budgets & settings. <strong>Collector</strong> adds vargani/bills and
            tracks cash-in-hand. <strong>Auditor</strong> has read-only access.
          </div>
        </div>

        {/* Search & Role Filters */}
        {members.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member by name, phone, or role..."
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

        {/* Members List */}
        {members.length === 0 ? (
          <div className="bg-white/95 rounded-[24px] border border-slate-200/90 p-8 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              No committee members have joined yet. Share the invite link above.
            </p>
          </div>
        ) : sortedAndFilteredMembers.length === 0 ? (
          <div className="bg-white/95 rounded-[24px] border border-slate-200/90 p-6 text-center space-y-1">
            <p className="text-xs font-bold text-slate-700">No matching members</p>
            <p className="text-[11px] text-slate-500">
              Try clearing the search query or selecting “All”.
            </p>
          </div>
        ) : (
          <div
            style={{ animationDelay: '90ms' }}
            className="animate-page-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
          >
            {sortedAndFilteredMembers.map((m) => {
              const initials = getInitials(m.name);
              const isOwner = m.uid === mandal.ownerId;
              const isSelf = Boolean(currentMember?.uid && m.uid === currentMember.uid);
              const isUpdating = updatingUid === m.uid;
              const cashInHand = m.cashInHand ?? 0;

              return (
                <div key={m.uid} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-blue-500/12 text-blue-800 text-xs font-extrabold flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-slate-900 truncate">
                          {m.name || 'Member'}
                        </span>
                        {isOwner && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 shrink-0">
                            Owner
                          </span>
                        )}
                        {isSelf && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {m.phone || m.email || 'Member'} · Cash in hand:{' '}
                        <strong
                          className={`tabular-nums ${
                            cashInHand > 0 ? 'text-amber-800' : 'text-slate-600'
                          }`}
                        >
                          {formatINR(cashInHand)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <select
                    aria-label={`Role for ${m.name || 'member'}`}
                    disabled={!isAdmin || isOwner || isSelf || isUpdating}
                    value={m.role}
                    onChange={(e) =>
                      handleRoleChange(m.uid, m.name, e.target.value as MemberRole)
                    }
                    className="h-9 px-2.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-bold uppercase text-slate-800 shrink-0 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  >
                    <option value="admin">Admin</option>
                    <option value="collector">Collector</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MandalSubPageShell>
  );
}