import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  IndianRupee,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidingPillTabs } from '../components/SlidingControls';
import { useMandal } from '../context/MandalContext';
import { formatINR, formatReceiptDate, normalizeIndianPhone } from '../lib/i18n';
import { VENDOR_CATEGORIES, Vendor } from '../types';

export function VendorsPage() {
  const navigate = useNavigate();
  const {
    activeUtsav,
    vendors,
    effectiveRole,
    addVendor,
    recordVendorPayment,
    deleteVendor,
  } = useMandal();

  const isAdmin = effectiveRole === 'admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');
  const [showForm, setShowForm] = useState(false);

  // Add Vendor Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(VENDOR_CATEGORIES[0]);
  const [phone, setPhone] = useState('');
  const [totalContract, setTotalContract] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Record Payment State
  const [payingVendor, setPayingVendor] = useState<Vendor | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payingSaving, setPayingSaving] = useState(false);

  const summary = useMemo(() => {
    const total = vendors.reduce((s, v) => s + v.totalContract, 0);
    const paid = vendors.reduce((s, v) => s + v.advancePaid, 0);
    const baki = Math.max(0, total - paid);
    return { total, paid, baki };
  }, [vendors]);

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          v.name.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          (v.note || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vendors, statusFilter, search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const contractNum = Number(totalContract);
    if (!name.trim() || !contractNum || contractNum <= 0) return;
    try {
      setSaving(true);
      await addVendor({
        name,
        category,
        phone,
        totalContract: contractNum,
        advancePaid: Number(advancePaid) || 0,
        dueDate: dueDate || undefined,
        note,
      });
      setName('');
      setPhone('');
      setTotalContract('');
      setAdvancePaid('');
      setDueDate('');
      setNote('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingVendor) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    try {
      setPayingSaving(true);
      await recordVendorPayment(payingVendor.id, amt);
      setPayingVendor(null);
      setPayAmount('');
    } finally {
      setPayingSaving(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-full bg-[#F5F7FB] text-slate-900 selection:bg-blue-600/15">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-extrabold text-slate-900 truncate">
              Vendors &amp; Udhaar Ledger
            </h1>
            <p className="text-xs text-slate-500 truncate">
              {activeUtsav ? `${activeUtsav.name} · ${activeUtsav.yearCycle}` : 'Contract & Baki Tracker'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="min-h-[40px] px-3.5 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm hover:bg-[#1D4ED8] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{showForm ? 'Close' : 'Add Vendor'}</span>
          </button>
        )}
      </header>

      <div className="p-4 sm:px-6 space-y-4 w-full mx-auto pb-8">
        {/* KPI Row */}
        <div style={{ animationDelay: '0ms' }} className="animate-page-in grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/70 shadow-sm p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Contract
            </div>
            <div className="mt-1 text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">
              {formatINR(summary.total)}
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/70 shadow-sm p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Advance Paid
            </div>
            <div className="mt-1 text-base sm:text-lg font-extrabold text-[#2563EB] tabular-nums">
              {formatINR(summary.paid)}
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/70 shadow-sm p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#E05A47]">
              Baki Due
            </div>
            <div className="mt-1 text-base sm:text-lg font-extrabold text-[#E05A47] tabular-nums">
              {formatINR(summary.baki)}
            </div>
          </div>
        </div>

        {!isAdmin && (
          <div className="rounded-2xl bg-amber-50/90 border border-amber-200/80 px-4 py-3 text-xs font-semibold text-amber-900">
            View-only for Collectors/Auditors — Admin or Treasurer records vendor contracts and advance payments.
          </div>
        )}

        {/* Add Vendor Form (Admin Only) */}
        {isAdmin && showForm && (
          <form
            onSubmit={handleAdd}
            className="animate-step-in rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm p-4 space-y-3.5"
          >
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Briefcase className="w-4 h-4 text-[#2563EB]" />
              <span>New Vendor / Service Contract</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendor / Agency Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sai Mandap Decorators"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
                >
                  {VENDOR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Contract (₹) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="50000"
                  value={totalContract}
                  onChange={(e) => setTotalContract(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white border border-slate-200 text-sm font-bold tabular-nums focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Advance Paid (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="10000"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white border border-slate-200 text-sm font-bold tabular-nums focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full min-h-[44px] px-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Note</label>
              <input
                type="text"
                placeholder="Stage, sound wattage, final settlement terms..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[46px] rounded-xl bg-[#2563EB] text-white text-sm font-extrabold hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {saving ? 'Saving Vendor...' : 'Save Vendor Contract'}
            </button>
          </form>
        )}

        {/* Search & Filters */}
        <div style={{ animationDelay: '45ms' }} className="animate-page-in flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vendor name, service, note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[42px] pl-10 pr-3 rounded-xl bg-white/80 backdrop-blur-md border border-slate-200/80 text-sm focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <SlidingPillTabs
            ariaLabel="Filter vendors by payment status"
            tone="blue"
            size="sm"
            className="sm:w-[290px]"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'partial', label: 'Partial' },
              { id: 'paid', label: 'Paid' },
            ]}
          />
        </div>

        {/* Vendor List */}
        {filtered.length === 0 ? (
          <div
            style={{ animationDelay: '85ms' }}
            className="animate-page-in rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/70 p-8 text-center space-y-2"
          >
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-800">No vendor contracts yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Track Mandap, Sound, Murti, Lighting &amp; Catering contracts with advance paid and remaining baki due dates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((v, idx) => {
              const remaining = Math.max(0, v.totalContract - v.advancePaid);
              const pct =
                v.totalContract > 0 ? Math.min(100, Math.round((v.advancePaid / v.totalContract) * 100)) : 0;
              const isOverdue = Boolean(v.dueDate && v.dueDate < todayStr && remaining > 0);
              const isDueSoon = Boolean(
                !isOverdue &&
                  v.dueDate &&
                  remaining > 0 &&
                  (new Date(v.dueDate).getTime() - new Date(todayStr).getTime()) / 86400000 <= 3
              );

              return (
                <div
                  key={v.id}
                  style={{ animationDelay: `${75 + Math.min(idx, 8) * 35}ms` }}
                  className="animate-page-in rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/70 shadow-sm p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-slate-900">{v.name}</h3>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {v.category}
                        </span>
                      </div>
                      {v.note && <p className="text-xs text-slate-500 mt-1">{v.note}</p>}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {v.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Settled</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overdue · {formatReceiptDate(v.dueDate!)}</span>
                        </span>
                      ) : isDueSoon ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                          <Clock className="w-3 h-3" />
                          <span>Due Soon · {formatReceiptDate(v.dueDate!)}</span>
                        </span>
                      ) : v.dueDate ? (
                        <span className="text-[11px] font-semibold text-slate-500">
                          Due {formatReceiptDate(v.dueDate)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Progress & Numbers */}
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          remaining === 0 ? 'bg-[#2563EB]' : 'bg-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase font-bold">
                          Contract
                        </span>
                        <span className="font-bold text-slate-800">{formatINR(v.totalContract)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase font-bold">
                          Paid ({pct}%)
                        </span>
                        <span className="font-bold text-[#2563EB]">{formatINR(v.advancePaid)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block uppercase font-bold">
                          Remaining Baki
                        </span>
                        <span
                          className={`font-extrabold ${
                            remaining > 0 ? 'text-[#E05A47]' : 'text-[#2563EB]'
                          }`}
                        >
                          {formatINR(remaining)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {v.phone && (
                        <a
                          href={`tel:${normalizeIndianPhone(v.phone)}`}
                          className="min-h-[36px] px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-slate-200"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{v.phone}</span>
                        </a>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        {remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayingVendor(v);
                              setPayAmount(String(remaining));
                            }}
                            className="min-h-[36px] px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold inline-flex items-center gap-1 hover:bg-blue-100"
                          >
                            <IndianRupee className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteVendor(v.id)}
                          className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100"
                          title="Delete Vendor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full-Screen Record Vendor Payment View */}
      {payingVendor && (
        <div className="animate-step-in fixed inset-0 z-50 bg-[#F8FAFC] text-slate-900 flex flex-col w-full h-[100dvh] overflow-hidden">
          <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shrink-0">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Record Vendor Payment</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {payingVendor.name} · Remaining Baki:{' '}
                <strong className="text-[#E05A47]">
                  {formatINR(Math.max(0, payingVendor.totalContract - payingVendor.advancePaid))}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPayingVendor(null)}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
            <form
              onSubmit={handleRecordPayment}
              className="animate-page-in max-w-xl mx-auto rounded-3xl bg-white p-5 shadow-xs space-y-4 border border-slate-200"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, payingVendor.totalContract - payingVendor.advancePaid)}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full min-h-[46px] px-3 rounded-xl border border-slate-200 text-base font-extrabold tabular-nums text-[#2563EB] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={payingSaving}
                  className="flex-1 min-h-[46px] rounded-xl bg-[#2563EB] text-white text-sm font-extrabold hover:bg-[#1D4ED8]"
                >
                  {payingSaving ? 'Saving...' : 'Confirm Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setPayingVendor(null)}
                  className="min-h-[46px] px-5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
