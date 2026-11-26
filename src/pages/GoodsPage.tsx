import {
  ArrowLeft,
  EyeOff,
  IndianRupee,
  List,
  Package,
  Phone,
  Search,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrnateReceipt } from '../components/DigitalReceiptCard';
import { EntryDetailModal } from '../components/EntryModals';
import { SlidingPillTabs, SlidingSwitch } from '../components/SlidingControls';
import { useMandal } from '../context/MandalContext';
import { formatINR, formatReceiptDate } from '../lib/i18n';
import { GOODS_HEADS, LedgerEntry } from '../types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GoodsPage() {
  const navigate = useNavigate();
  const {
    mandal,
    activeUtsav,
    utsavEntries,
    effectiveRole,
    language,
    privacyMasked,
    addGoodsEntry,
    sendAutomatedWhatsAppReceipt,
  } = useMandal();

  const [mobileTab, setMobileTab] = useState<'add' | 'list'>(
    effectiveRole === 'auditor' ? 'list' : 'add'
  );
  const [donorName, setDonorName] = useState('');
  const [flatOrAddress, setFlatOrAddress] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [head, setHead] = useState<string>(GOODS_HEADS[0]);
  const [goodsDescription, setGoodsDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [entryDate, setEntryDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState<LedgerEntry | null>(null);

  const [search, setSearch] = useState('');
  const [headFilter, setHeadFilter] = useState<string>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const goodsEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return utsavEntries.filter((e) => {
      if (e.isVoided || e.type !== 'goods') return false;
      if (headFilter !== 'ALL' && e.head !== headFilter) return false;
      if (q) {
        const hay = [
          e.titleOrDonorName,
          e.flatOrAddress,
          e.head,
          e.goodsDescription,
          e.quantity,
          e.note,
          e.createdByName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [utsavEntries, headFilter, search]);

  const { totalCount, totalEstimatedValue } = useMemo(() => {
    const active = utsavEntries.filter((e) => !e.isVoided && e.type === 'goods');
    return {
      totalCount: active.length,
      totalEstimatedValue: active.reduce((s, e) => s + (e.estimatedValue || 0), 0),
    };
  }, [utsavEntries]);

  if (!mandal || !activeUtsav) return null;

  const isAuditor = effectiveRole === 'auditor';

  const resetForm = () => {
    setDonorName('');
    setFlatOrAddress('');
    setDonorPhone('');
    setGoodsDescription('');
    setQuantity('');
    setEstimatedValue('');
    setIsAnonymous(false);
    setNote('');
    setSavedEntry(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim() || !goodsDescription.trim()) return;
    try {
      setSaving(true);
      const created = await addGoodsEntry({
        donorName,
        flatOrAddress,
        donorPhone: donorPhone.trim() || undefined,
        head,
        goodsDescription,
        quantity: quantity.trim() || undefined,
        estimatedValue: Number(estimatedValue) > 0 ? Number(estimatedValue) : undefined,
        isAnonymous,
        entryDate,
        note,
      });
      setSavedEntry(created);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-full bg-[#F5F7FB] text-slate-900 pb-8 selection:bg-blue-600/15">
      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
              aria-label="Back"
              className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center text-slate-700 hover:bg-slate-50 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[17px] font-extrabold text-slate-900 truncate tracking-tight">
                Vastu Daan / In-Kind Goods
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                {activeUtsav.name} · {activeUtsav.yearCycle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/entries?type=goods')}
            className="h-9 px-3 rounded-full bg-white border border-slate-200/90 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 hover:bg-slate-50 shrink-0"
          >
            <List className="w-3.5 h-3.5 text-amber-700" />
            <span>All Entries</span>
          </button>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Info / Summary Banner */}
        <section
          style={{ animationDelay: '0ms' }}
          className="animate-page-in rounded-2xl bg-amber-50/90 border border-amber-200/90 p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-amber-950">
                {totalCount} Vastu / Prasad Contributions Recorded
              </div>
              <p className="text-xs text-amber-800/90">
                Tracked separately from Net Cash-in-Hand — displayed on the Donor Wall with formal thank-you receipts.
              </p>
            </div>
          </div>
          {totalEstimatedValue > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-right shrink-0">
              <div className="text-[10px] font-bold uppercase text-amber-800">Est. Total Value</div>
              <div className="text-sm font-extrabold text-amber-950 tabular-nums">
                {formatINR(totalEstimatedValue, privacyMasked)}
              </div>
            </div>
          )}
        </section>

        {/* Mobile Switcher with 120fps Sliding Pill */}
        {!isAuditor && (
          <div style={{ animationDelay: '35ms' }} className="lg:hidden animate-page-in">
            <SlidingPillTabs
              value={mobileTab}
              onChange={setMobileTab}
              tone="amber"
              ariaLabel="Goods section view"
              options={[
                { id: 'add', label: 'Add Vastu', icon: <Package className="w-4 h-4" /> },
                {
                  id: 'list',
                  label: `Register (${goodsEntries.length})`,
                  icon: <List className="w-4 h-4" />,
                },
              ]}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left: Add Goods Form or Thank-You Receipt */}
          {!isAuditor && (
            <section
              style={{ animationDelay: '65ms' }}
              className={`animate-page-in lg:col-span-5 bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-5 shadow-xs ${
                mobileTab === 'add' ? 'block' : 'hidden lg:block'
              }`}
            >
              {savedEntry ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-amber-800">
                      Vastu Daan Receipt Ready
                    </h2>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs font-bold text-slate-600 underline"
                    >
                      + Add Another
                    </button>
                  </div>
                  <OrnateReceipt
                    mandal={mandal}
                    utsavName={`${activeUtsav.name} (${activeUtsav.yearCycle})`}
                    entry={savedEntry}
                    defaultLanguage={language}
                    onResendWhatsApp={async (lang) => {
                      const res = await sendAutomatedWhatsAppReceipt(savedEntry, undefined, lang);
                      return res.receiptImageUrl;
                    }}
                  />
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold"
                  >
                    Record Next Vastu
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      + Add In-Kind Vastu Daan
                    </h2>
                    <p className="text-xs text-slate-500">
                      Log rice, modak, flowers, or sponsored equipment with thank-you receipt
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Donor Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Deshmukh Family"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        WhatsApp Mobile
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          placeholder="10-digit (optional)"
                          value={donorPhone}
                          onChange={(e) => setDonorPhone(e.target.value)}
                          className="w-full min-h-[44px] pl-8 pr-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Flat / Address
                      </label>
                      <input
                        type="text"
                        placeholder="Flat B-101"
                        value={flatOrAddress}
                        onChange={(e) => setFlatOrAddress(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category
                      </label>
                      <select
                        value={head}
                        onChange={(e) => setHead(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-amber-500"
                      >
                        {GOODS_HEADS.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Item Description *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Basmati Rice / Sound Sponsorship / Flower Garland"
                      value={goodsDescription}
                      onChange={(e) => setGoodsDescription(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Quantity / Unit
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 50 kg / 251 pcs"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Est. Value (₹)
                      </label>
                      <div className="relative">
                        <IndianRupee className="w-3.5 h-3.5 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          min={0}
                          placeholder="0 (optional)"
                          value={estimatedValue}
                          onChange={(e) => setEstimatedValue(e.target.value)}
                          className="w-full min-h-[44px] pl-8 pr-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm font-bold tabular-nums focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Note
                      </label>
                      <input
                        type="text"
                        placeholder="Optional note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div
                    onClick={() => setIsAnonymous((v) => !v)}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F5F7FB] border border-slate-200 cursor-pointer active:scale-[0.995] transition-transform"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <EyeOff className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Gupt Daan (Hide Name Publicly)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Public Donor Wall shows &quot;Gupt Daan / Anonymous&quot;
                        </div>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <SlidingSwitch
                        checked={isAnonymous}
                        onChange={setIsAnonymous}
                        tone="amber"
                        ariaLabel="Gupt Daan toggle"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-sm font-extrabold transition-all shadow-xs disabled:opacity-60"
                  >
                    {saving ? 'Generating Receipt...' : 'Save Vastu & Generate Receipt'}
                  </button>
                </form>
              )}
            </section>
          )}

          {/* Right: Goods Register */}
          <section
            style={{ animationDelay: '95ms' }}
            className={`animate-page-in ${isAuditor ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-3 ${
              isAuditor || mobileTab === 'list' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="bg-white/95 rounded-[24px] border border-slate-200/90 p-4 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  Vastu Register ({goodsEntries.length})
                </h2>
                <select
                  aria-label="Filter goods category"
                  value={headFilter}
                  onChange={(e) => setHeadFilter(e.target.value)}
                  className="min-h-[34px] px-2.5 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">All Categories</option>
                  {GOODS_HEADS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search donor, item, quantity, or flat..."
                  className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="bg-white/95 rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {goodsEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No in-kind goods entries yet.
                </div>
              ) : (
                goodsEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/90 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-700 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {entry.titleOrDonorName}
                          </span>
                          {entry.isAnonymous && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                              Gupt
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-amber-800 truncate">
                          {entry.goodsDescription}
                          {entry.quantity ? ` (${entry.quantity})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {entry.head}
                          {entry.flatOrAddress ? ` · ${entry.flatOrAddress}` : ''} ·{' '}
                          {formatReceiptDate(entry.entryDate)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {entry.estimatedValue && entry.estimatedValue > 0 ? (
                        <div className="text-xs font-extrabold text-amber-800 tabular-nums">
                          Est. {formatINR(entry.estimatedValue, privacyMasked)}
                        </div>
                      ) : null}
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/70 mt-0.5">
                        In-Kind
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}
