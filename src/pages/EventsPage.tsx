import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { SlidingPillTabs } from '../components/SlidingControls';
import { useMandal } from '../context/MandalContext';
import { formatReceiptDate } from '../lib/i18n';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

interface GlassDatePickerProps {
  value: string;
  onChange: (iso: string) => void;
}

function GlassDatePicker({ value, onChange }: GlassDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 16 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const openPicker = () => {
    const parsed = parseIsoDate(value);
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 280;
      const popoverHeight = 324;
      const clampedLeft = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - popoverWidth - 12)
      );
      const fitsBelow = rect.bottom + 8 + popoverHeight <= window.innerHeight - 12;
      setCoords({
        top: fitsBelow ? rect.bottom + 8 : Math.max(12, rect.top - popoverHeight - 8),
        left: clampedLeft,
      });
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handleResize = () => setOpen(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

  const calendarCells = useMemo(() => {
    const firstDayWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { iso: string; day: number; inCurrentMonth: boolean }[] = [];

    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
      cells.push({ iso: toIsoDate(d), day: d.getDate(), inCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      cells.push({ iso: toIsoDate(d), day, inCurrentMonth: true });
    }
    while (cells.length < 42) {
      const nextDay = cells.length - (firstDayWeekday + daysInMonth) + 1;
      const d = new Date(viewYear, viewMonth + 1, nextDay);
      cells.push({ iso: toIsoDate(d), day: d.getDate(), inCurrentMonth: false });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        aria-label="Select event date"
        aria-expanded={open}
        className={`min-w-0 w-full h-11 px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-between gap-1.5 transition-all active:scale-[0.98] touch-manipulation ${
          open
            ? 'bg-white border-blue-500 ring-4 ring-blue-500/10 text-slate-900'
            : 'bg-[#F5F7FB] border-slate-200/90 text-slate-800 hover:bg-slate-100/80'
        }`}
      >
        <span className="truncate tabular-nums">{formatReceiptDate(value)}</span>
        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-slate-950/[0.05]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-label="Choose event date"
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: '280px',
              }}
              className="animate-popover-in z-[9999] p-3 rounded-[22px] bg-white/95 backdrop-blur-2xl border border-slate-200/95 shadow-[0_22px_48px_-10px_rgba(15,23,42,0.22),0_0_0_1px_rgba(255,255,255,0.9)_inset]"
            >
              {/* Month / Year Header */}
              <div className="flex items-center justify-between gap-1 pb-2.5">
                <div className="text-xs font-extrabold text-slate-900 tracking-tight pl-1">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    aria-label="Previous month"
                    className="w-7 h-7 rounded-lg bg-[#F5F7FB] hover:bg-slate-200/70 active:scale-90 text-slate-700 flex items-center justify-center transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Next month"
                    className="w-7 h-7 rounded-lg bg-[#F5F7FB] hover:bg-slate-200/70 active:scale-90 text-slate-700 flex items-center justify-center transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-0.5 text-center pb-1">
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1"
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarCells.map((cell) => {
                  const isSelected = cell.iso === value;
                  const isToday = cell.iso === todayIso;
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => {
                        onChange(cell.iso);
                        setOpen(false);
                      }}
                      className={`h-8 rounded-xl text-xs font-bold tabular-nums flex items-center justify-center transition-all active:scale-90 touch-manipulation ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30 font-extrabold'
                          : isToday
                          ? 'bg-blue-50 text-blue-800 border border-blue-300/80'
                          : cell.inCurrentMonth
                          ? 'text-slate-800 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setViewYear(now.getFullYear());
                    setViewMonth(now.getMonth());
                    onChange(todayIso);
                    setOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[11px] font-extrabold text-blue-800 transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

interface GlassTimePickerProps {
  value: string;
  onChange: (val: string) => void;
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45'];

function GlassTimePicker({ value, onChange }: GlassTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 16 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const parsed = useMemo(() => {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return { hour: '07', minute: '00', period: 'PM' as 'AM' | 'PM' };
    return {
      hour: match[1].padStart(2, '0'),
      minute: match[2],
      period: match[3].toUpperCase() as 'AM' | 'PM',
    };
  }, [value]);

  const openPicker = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 256;
      const popoverHeight = 250;
      const clampedLeft = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - popoverWidth - 12)
      );
      const fitsBelow = rect.bottom + 8 + popoverHeight <= window.innerHeight - 12;
      setCoords({
        top: fitsBelow ? rect.bottom + 8 : Math.max(12, rect.top - popoverHeight - 8),
        left: clampedLeft,
      });
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handleResize = () => setOpen(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

  const updateTime = (h: string, m: string, p: 'AM' | 'PM') => {
    onChange(`${h}:${m} ${p}`);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        aria-label="Select event time"
        aria-expanded={open}
        className={`min-w-0 w-full h-11 px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-between gap-1.5 transition-all active:scale-[0.98] touch-manipulation ${
          open
            ? 'bg-white border-blue-500 ring-4 ring-blue-500/10 text-slate-900'
            : 'bg-[#F5F7FB] border-slate-200/90 text-slate-800 hover:bg-slate-100/80'
        }`}
      >
        <span className="truncate tabular-nums">{value || '07:00 PM'}</span>
        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-slate-950/[0.05]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-label="Choose event time"
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: '256px',
              }}
              className="animate-popover-in z-[9999] p-3 rounded-[22px] bg-white/95 backdrop-blur-2xl border border-slate-200/95 shadow-[0_22px_48px_-10px_rgba(15,23,42,0.22),0_0_0_1px_rgba(255,255,255,0.9)_inset] space-y-2.5"
            >
              {/* Header + AM/PM Segmented Switch */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.07em] text-slate-400 pl-1">
                  Event Time
                </span>
                <SlidingPillTabs
                  ariaLabel="AM or PM"
                  tone="blue"
                  size="xs"
                  className="w-[104px]"
                  value={parsed.period}
                  onChange={(p) => updateTime(parsed.hour, parsed.minute, p)}
                  options={[
                    { id: 'AM', label: 'AM' },
                    { id: 'PM', label: 'PM' },
                  ]}
                />
              </div>

              {/* Hours Grid */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 pl-1">Hour</div>
                <div className="grid grid-cols-6 gap-1">
                  {HOURS.map((h) => {
                    const active = parsed.hour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => updateTime(h, parsed.minute, parsed.period)}
                        className={`h-8 rounded-lg text-xs font-bold tabular-nums transition-all active:scale-90 ${
                          active
                            ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                            : 'bg-[#F5F7FB] text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes Grid */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 pl-1">Minute</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {MINUTES.map((m) => {
                    const active = parsed.minute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          updateTime(parsed.hour, m, parsed.period);
                          setOpen(false);
                        }}
                        className={`h-8 rounded-lg text-xs font-bold tabular-nums transition-all active:scale-90 ${
                          active
                            ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                            : 'bg-[#F5F7FB] text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        :{m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

export function EventsPage() {
  const navigate = useNavigate();
  const { mandal, activeUtsav, events, effectiveRole, addEvent, deleteEvent } = useMandal();

  const [evtTitle, setEvtTitle] = useState('');
  const [evtDate, setEvtDate] = useState(() => toIsoDate(new Date()));
  const [evtTime, setEvtTime] = useState('07:00 PM');
  const [evtLoc, setEvtLoc] = useState('Main Mandap');
  const [evtDesc, setEvtDesc] = useState('');
  const [saving, setSaving] = useState(false);

  if (!mandal || !activeUtsav) return null;

  const isAdmin = effectiveRole === 'admin';

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle.trim() || !isAdmin || saving) return;
    try {
      setSaving(true);
      await addEvent({
        title: evtTitle.trim(),
        date: evtDate,
        time: evtTime.trim() || '07:00 PM',
        location: evtLoc.trim() || undefined,
        description: evtDesc.trim() || undefined,
      });
      setEvtTitle('');
      setEvtDesc('');
    } finally {
      setSaving(false);
    }
  };

  const handleSharePatrika = () => {
    const text = [
      `📅 *${mandal.name}* — ${activeUtsav.name} Events Patrika`,
      ...events.map(
        (ev) => `• ${ev.date} (${ev.time}): *${ev.title}* @ ${ev.location || 'Pandal'}`
      ),
    ].join('\n');
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F5F7FB] text-slate-900 overscroll-y-contain selection:bg-blue-500/15">
      {/* 120fps Compositor-Only Keyframes (transform + opacity only) */}
      <style>{`
        @keyframes eventsCardReveal {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0) scale(0.988);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes popoverPopIn {
          0% {
            opacity: 0;
            transform: translate3d(0, -6px, 0) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        .animate-event-in {
          will-change: transform, opacity;
          animation: eventsCardReveal 0.44s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-popover-in {
          will-change: transform, opacity;
          transform-origin: top left;
          animation: popoverPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Sticky Liquid-Glass App Header */}
      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/home')}
              aria-label="Back to Home"
              className="w-10 h-10 rounded-2xl bg-white/95 border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(16,24,40,0.06)] flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-90 transition-all shrink-0 touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[17px] font-extrabold text-slate-900 truncate tracking-tight leading-tight">
                Events Patrika
              </h1>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {activeUtsav.name} · Aarti, Prasad & Schedule
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSharePatrika}
            className="h-9 px-3.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold shadow-xs shadow-blue-600/20 inline-flex items-center gap-1.5 shrink-0 transition-all touch-manipulation"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Share Patrika</span>
          </button>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 pt-3.5 pb-8 space-y-4">
        {/* Admin Add Festival Event Form Card */}
        {isAdmin && (
          <form
            onSubmit={handleAddEvent}
            style={{ animationDelay: '0ms' }}
            className="animate-event-in relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[26px] border border-slate-200/90 p-4 space-y-3 shadow-[0_10px_28px_-10px_rgba(16,24,40,0.07),inset_0_1px_0_0_rgba(255,255,255,1)]"
          >
            <div className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.07em] text-slate-500">
                <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span>Add Festival Event</span>
              </div>
              <span className="text-[11px] font-bold text-blue-700">
                {activeUtsav.yearCycle}
              </span>
            </div>

            <input
              type="text"
              required
              placeholder="Event Title (e.g. Maha-Aarti & Modak Prasad)"
              value={evtTitle}
              onChange={(e) => setEvtTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <GlassDatePicker value={evtDate} onChange={setEvtDate} />
              <GlassTimePicker value={evtTime} onChange={setEvtTime} />
              <div className="relative col-span-2 sm:col-span-1 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Event location"
                  value={evtLoc}
                  onChange={(e) => setEvtLoc(e.target.value)}
                  placeholder="Main Mandap"
                  className="w-full h-11 pl-8 pr-3 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500/60 transition-all"
                />
              </div>
            </div>

            <input
              type="text"
              placeholder="Optional description or sponsorship note"
              value={evtDesc}
              onChange={(e) => setEvtDesc(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500/60 transition-all"
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white text-xs font-extrabold shadow-xs shadow-blue-600/20 inline-flex items-center justify-center gap-1.5 transition-all touch-manipulation"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{saving ? 'Adding...' : 'Add Event to Patrika'}</span>
            </button>
          </form>
        )}

        {/* Scheduled Events Section */}
        <section className="space-y-2.5">
          {events.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
                Program Schedule
              </h2>
              <span className="text-[11px] font-extrabold tabular-nums px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800">
                {events.length} {events.length === 1 ? 'Event' : 'Events'}
              </span>
            </div>
          )}

          {events.length === 0 ? (
            <div
              style={{ animationDelay: '55ms' }}
              className="animate-event-in bg-white/95 backdrop-blur-xl rounded-[26px] border border-slate-200/90 p-9 text-center space-y-2.5 shadow-[0_6px_20px_-6px_rgba(16,24,40,0.05)]"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-slate-900">No events scheduled yet</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Add Aarti, Prasad, cultural programs, or Visarjan timings to share with your
                  society.
                </p>
              </div>
            </div>
          ) : (
            events.map((ev, idx) => (
              <div
                key={ev.id}
                style={{ animationDelay: `${50 + idx * 40}ms` }}
                className="animate-event-in bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-200/90 p-4 flex items-start justify-between gap-3 shadow-[0_4px_16px_-6px_rgba(16,24,40,0.05)]"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800">
                      <Calendar className="w-3 h-3 text-amber-700" />
                      <span>{formatReceiptDate(ev.date)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>{ev.time}</span>
                    </span>
                  </div>

                  <div className="text-sm font-extrabold text-slate-900 leading-snug">
                    {ev.title}
                  </div>

                  {ev.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
                  )}

                  {ev.location && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => deleteEvent(ev.id)}
                    aria-label="Delete event"
                    className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-90 border border-rose-200/70 text-rose-600 flex items-center justify-center shrink-0 transition-all touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}