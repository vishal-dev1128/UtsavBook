import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Home,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidingPillTabs } from '../components/SlidingControls';
import { useMandal } from '../context/MandalContext';
import { buildWhatsAppReminderMessage, buildWhatsAppUrl } from '../lib/i18n';
import { NakashaUnit } from '../types';

export function NakashaPage() {
  const navigate = useNavigate();
  const {
    mandal,
    activeUtsav,
    nakasha,
    currentMember,
    effectiveRole,
    upsertNakashaUnit,
    bulkAddNakashaUnits,
    deleteNakashaUnit,
  } = useMandal();

  const [wingName, setWingName] = useState('Wing A');
  const [flatNum, setFlatNum] = useState('');
  const [residentName, setResidentName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedWing, setSelectedWing] = useState<string>('ALL');
  const [saving, setSaving] = useState(false);

  // Bulk generator state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkWing, setBulkWing] = useState('A');
  const [startFloor, setStartFloor] = useState('1');
  const [endFloor, setEndFloor] = useState('4');
  const [flatsPerFloor, setFlatsPerFloor] = useState('4');
  const [bulkPrefix, setBulkPrefix] = useState('Resident');
  const [bulkBusy, setBulkBusy] = useState(false);

  const wings = useMemo(() => {
    const set = new Set(nakasha.map((u) => u.wingName));
    return ['ALL', ...Array.from(set)];
  }, [nakasha]);

  const filteredUnits = useMemo(() => {
    return nakasha.filter((u) => selectedWing === 'ALL' || u.wingName === selectedWing);
  }, [nakasha, selectedWing]);

  const counts = useMemo(() => {
    let collected = 0;
    let pending = 0;
    let locked = 0;
    for (const u of nakasha) {
      if (u.status === 'collected') collected += 1;
      else if (u.status === 'skipped' || u.status === 'not_home') locked += 1;
      else pending += 1;
    }
    return { collected, pending, locked, total: nakasha.length };
  }, [nakasha]);

  if (!mandal) return null;

  const isAuditor = effectiveRole === 'auditor';
  const isAdmin = effectiveRole === 'admin';
  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/m/${mandal.joinCode}` : undefined;

  const sFloor = Math.max(1, Number(startFloor) || 1);
  const eFloor = Math.max(sFloor, Number(endFloor) || sFloor);
  const perFloor = Math.max(1, Math.min(20, Number(flatsPerFloor) || 4));
  const bulkCount = Math.min(80, (eFloor - sFloor + 1) * perFloor);
  const cleanWing = bulkWing.trim() || 'A';

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatNum.trim() || !residentName.trim() || isAuditor) return;
    try {
      setSaving(true);
      const unit: NakashaUnit = {
        id: `unit_${Date.now()}`,
        user_id: mandal.user_id,
        wingName: wingName.trim() || 'Wing A',
        flatNumber: flatNum.trim(),
        residentName: residentName.trim(),
        phone: phone.trim() || undefined,
        status: 'pending',
        donationAmount: 0,
        assignedCollectorUid: currentMember?.uid,
        assignedCollectorName: currentMember?.name,
      };
      await upsertNakashaUnit(unit);
      setFlatNum('');
      setResidentName('');
      setPhone('');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || bulkBusy) return;
    setBulkBusy(true);
    try {
      const units: Array<Omit<NakashaUnit, 'user_id'>> = [];
      const ts = Date.now();
      let idx = 0;
      for (let f = sFloor; f <= eFloor; f += 1) {
        for (let u = 1; u <= perFloor; u += 1) {
          if (units.length >= 80) break;
          const flatCode = `${cleanWing}-${f}${String(u).padStart(2, '0')}`;
          units.push({
            id: `unit_${ts}_${idx++}`,
            wingName: `Wing ${cleanWing}`,
            flatNumber: flatCode,
            residentName: `${bulkPrefix.trim() || 'Resident'} ${flatCode}`,
            status: 'pending',
            donationAmount: 0,
            assignedCollectorUid: currentMember?.uid,
            assignedCollectorName: currentMember?.name,
          });
        }
      }
      await bulkAddNakashaUnits(units);
      setShowBulk(false);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleWhatsAppReminder = (u: NakashaUnit) => {
    const msg = buildWhatsAppReminderMessage({
      residentName: u.residentName,
      flatNumber: u.flatNumber,
      wingName: u.wingName,
      mandalName: mandal.name,
      utsavName: activeUtsav?.name || 'Ganeshotsav',
      publicUrl,
    });
    window.open(buildWhatsAppUrl(u.phone, msg), '_blank', 'noopener,noreferrer');
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
                Directory / Flat Directory
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                Ghar-ghar pending vargani tracker &amp; WhatsApp reminders
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-extrabold text-blue-800 tabular-nums shrink-0">
            {counts.collected}/{counts.total} Paid
          </span>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Progress Summary: Paid (Emerald), Pending (Amber), Locked/Skipped (Slate) */}
        <section style={{ animationDelay: '0ms' }} className="animate-page-in grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-blue-50/80 border border-blue-200 p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Paid</span>
            </div>
            <div className="text-xl font-extrabold text-blue-900 tabular-nums mt-1">
              {counts.collected}
            </div>
          </div>
          <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
            </div>
            <div className="text-xl font-extrabold text-amber-950 tabular-nums mt-1">
              {counts.pending}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-100/90 border border-slate-200 p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
              <Lock className="w-3.5 h-3.5" />
              <span>Locked / Skipped</span>
            </div>
            <div className="text-xl font-extrabold text-slate-800 tabular-nums mt-1">
              {counts.locked}
            </div>
          </div>
        </section>

        {/* Add Flat Form + Bulk Generator Toggle */}
        {!isAuditor && (
          <div
            style={{ animationDelay: '45ms' }}
            className="animate-page-in bg-white/95 rounded-[24px] border border-slate-200/90 p-4 space-y-3 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{showBulk ? 'Bulk Wing / Flat Generator' : 'Add Flat / House Unit'}</span>
              </div>
              {isAdmin && (
                <SlidingPillTabs
                  ariaLabel="Entry mode"
                  tone="blue"
                  size="xs"
                  className="w-[216px]"
                  value={showBulk ? 'bulk' : 'single'}
                  onChange={(val) => setShowBulk(val === 'bulk')}
                  options={[
                    { id: 'single', label: 'Single Unit', icon: <Home className="w-3 h-3" /> },
                    { id: 'bulk', label: 'Bulk Generate', icon: <Building2 className="w-3 h-3" /> },
                  ]}
                />
              )}
            </div>

            {showBulk && isAdmin ? (
              <form key="bulk" onSubmit={handleBulkGenerate} className="animate-step-in space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Wing
                    </label>
                    <input
                      type="text"
                      value={bulkWing}
                      onChange={(e) => setBulkWing(e.target.value)}
                      placeholder="A"
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Start Floor
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={startFloor}
                      onChange={(e) => setStartFloor(e.target.value)}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      End Floor
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={endFloor}
                      onChange={(e) => setEndFloor(e.target.value)}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Flats / Floor
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={flatsPerFloor}
                      onChange={(e) => setFlatsPerFloor(e.target.value)}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs font-bold tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 bg-[#F5F7FB] rounded-xl px-3 py-2 border border-slate-200/80">
                  <span>
                    Preview: <strong>{bulkCount} flats</strong> ({cleanWing}-{sFloor}01 to {cleanWing}-
                    {eFloor}
                    {String(perFloor).padStart(2, '0')})
                  </span>
                  <input
                    type="text"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    placeholder="Label prefix"
                    className="h-7 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold w-28"
                  />
                </div>
                <button
                  type="submit"
                  disabled={bulkBusy}
                  className="w-full min-h-[42px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold disabled:opacity-60"
                >
                  {bulkBusy ? 'Generating Flats...' : `Bulk Generate ${bulkCount} Units`}
                </button>
              </form>
            ) : (
              <form key="single" onSubmit={handleAddUnit} className="animate-step-in space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Wing A / Lane 1"
                    value={wingName}
                    onChange={(e) => setWingName(e.target.value)}
                    className="min-h-[42px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Flat A-301 / House 12"
                    value={flatNum}
                    onChange={(e) => setFlatNum(e.target.value)}
                    className="min-h-[42px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Resident / Family Name"
                    value={residentName}
                    onChange={(e) => setResidentName(e.target.value)}
                    className="min-h-[42px] px-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs font-semibold"
                  />
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="WhatsApp Mobile (optional)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full min-h-[42px] pl-8 pr-3 rounded-xl bg-[#F5F7FB] border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full min-h-[42px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{saving ? 'Adding...' : 'Add to Directory'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Wing Filter Chips */}
        {wings.length > 2 && (
          <div style={{ animationDelay: '90ms' }} className="animate-page-in">
            {wings.length <= 4 ? (
              <SlidingPillTabs
                ariaLabel="Filter by wing"
                tone="blue"
                size="sm"
                value={selectedWing}
                onChange={setSelectedWing}
                options={wings.map((w) => ({
                  id: w,
                  label: w === 'ALL' ? 'All Wings' : w,
                }))}
              />
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {wings.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setSelectedWing(w)}
                    className={`min-h-[34px] px-3.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border transition-all active:scale-95 ${
                      selectedWing === w
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {w === 'ALL' ? 'All Wings' : w}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Units List */}
        <div
          style={{ animationDelay: '130ms' }}
          className="animate-page-in bg-white/95 rounded-[24px] border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-xs"
        >
          {filteredUnits.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <Home className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No flats added yet</p>
              <p className="text-[11px] text-slate-500">
                Use &quot;Bulk Generate&quot; or add units individually to track door-to-door Vargani coverage.
              </p>
            </div>
          ) : (
            filteredUnits.map((u) => {
              const isPaid = u.status === 'collected';
              const isLocked = u.status === 'skipped' || u.status === 'not_home';
              const isPending = !isPaid && !isLocked;

              return (
                <div
                  key={u.id}
                  className={`p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-l-4 ${
                    isPaid
                      ? 'border-l-blue-500 bg-blue-50/20'
                      : isLocked
                      ? 'border-l-slate-400 bg-slate-50/50'
                      : 'border-l-amber-400 bg-amber-50/20'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900 truncate">
                        {u.flatNumber} · {u.residentName}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isPaid
                            ? 'bg-blue-100 text-blue-800'
                            : isLocked
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {isPaid ? 'Paid' : isLocked ? 'Locked / Skipped' : 'Pending'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {u.wingName}
                      {u.phone ? ` · ${u.phone}` : ''} · {u.assignedCollectorName || 'Unassigned'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleWhatsAppReminder(u)}
                        title="Send WhatsApp Reminder"
                        className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Remind</span>
                      </button>
                    )}

                    <select
                      aria-label={`Status for ${u.flatNumber}`}
                      disabled={isAuditor}
                      value={u.status}
                      onChange={(e) =>
                        upsertNakashaUnit({
                          ...u,
                          status: e.target.value as NakashaUnit['status'],
                        })
                      }
                      className={`min-h-[36px] px-2.5 rounded-xl text-xs font-bold border ${
                        isPaid
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : isLocked
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="collected">Paid ✓</option>
                      <option value="skipped">Locked / Skipped</option>
                      <option value="not_home">Not Home</option>
                    </select>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => deleteNakashaUnit(u.id)}
                        aria-label={`Delete ${u.flatNumber}`}
                        className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
