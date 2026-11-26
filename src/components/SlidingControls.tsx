import React from 'react';

export interface SlidingPillOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

type PillTone = 'white' | 'blue' | 'emerald' | 'rose' | 'amber';

const BLUE_PILL_STYLE = {
  thumb:
    'bg-blue-600 shadow-[0_4px_12px_-2px_rgba(37,99,235,0.38),inset_0_1px_0_0_rgba(255,255,255,0.28)]',
  activeText: 'text-white',
  inactiveText: 'text-slate-600 hover:text-slate-900',
};

const PILL_STYLES: Record<PillTone, { thumb: string; activeText: string; inactiveText: string }> = {
  white: {
    thumb:
      'bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.12)] border border-slate-200/70',
    activeText: 'text-slate-900',
    inactiveText: 'text-slate-500 hover:text-slate-800',
  },
  blue: BLUE_PILL_STYLE,
  emerald: BLUE_PILL_STYLE,
  rose: {
    thumb:
      'bg-rose-600 shadow-[0_4px_12px_-2px_rgba(225,29,72,0.38),inset_0_1px_0_0_rgba(255,255,255,0.28)]',
    activeText: 'text-white',
    inactiveText: 'text-slate-600 hover:text-slate-900',
  },
  amber: {
    thumb:
      'bg-amber-600 shadow-[0_4px_12px_-2px_rgba(217,119,6,0.38),inset_0_1px_0_0_rgba(255,255,255,0.28)]',
    activeText: 'text-white',
    inactiveText: 'text-slate-600 hover:text-slate-900',
  },
};

export function SlidingPillTabs<T extends string>({
  options,
  value,
  onChange,
  tone = 'white',
  size = 'md',
  ariaLabel,
  className = '',
}: {
  options: readonly SlidingPillOption<string>[];
  value: T;
  onChange: (value: NoInfer<T>) => void;
  tone?: PillTone;
  size?: 'xs' | 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}) {
  const count = Math.max(1, options.length);
  const activeIdx = Math.max(
    0,
    options.findIndex((o) => o.id === value)
  );
  const style = PILL_STYLES[tone];

  const heightCls =
    size === 'xs' ? 'h-8 text-[11px]' : size === 'sm' ? 'h-9 text-xs' : 'h-10 text-xs';
  const radiusOuter = size === 'xs' ? 'rounded-xl' : 'rounded-2xl';
  const radiusInner = size === 'xs' ? 'rounded-[9px]' : 'rounded-xl';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      className={`relative grid p-1 ${radiusOuter} bg-slate-200/75 border border-slate-200/80 shadow-inner ${className}`}
    >
      <div
        aria-hidden="true"
        style={{
          width: `calc((100% - 8px) / ${count})`,
          transform: `translate3d(${activeIdx * 100}%, 0, 0)`,
          willChange: 'transform',
        }}
        className={`pointer-events-none absolute top-1 bottom-1 left-1 ${radiusInner} ${style.thumb} transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
      />

      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id as T)}
            className={`relative z-10 ${heightCls} px-2 ${radiusInner} font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors duration-200 active:scale-[0.97] touch-manipulation ${
              active ? style.activeText : style.inactiveText
            }`}
          >
            {opt.icon}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const SWITCH_TONES: Record<'blue' | 'emerald' | 'rose' | 'amber' | 'terracotta', string> = {
  blue: 'bg-blue-600 shadow-blue-600/30',
  emerald: 'bg-[#10B981] shadow-emerald-500/30',
  rose: 'bg-rose-600 shadow-rose-600/30',
  amber: 'bg-amber-600 shadow-amber-600/30',
  terracotta: 'bg-[#EA580C] shadow-orange-600/30',
};

export function SlidingSwitch({
  checked,
  onChange,
  disabled = false,
  tone = 'blue',
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  tone?: 'blue' | 'emerald' | 'rose' | 'amber' | 'terracotta';
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={`relative inline-flex items-center w-12 h-7 p-1 rounded-full shrink-0 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-50 touch-manipulation ${
        checked ? `${SWITCH_TONES[tone]} shadow-xs` : 'bg-slate-300/90'
      }`}
    >
      <span
        aria-hidden="true"
        style={{
          transform: `translate3d(${checked ? '20px' : '0px'}, 0, 0)`,
          willChange: 'transform',
        }}
        className="w-5 h-5 rounded-full bg-white shadow-[0_2px_6px_-1px_rgba(15,23,42,0.28)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      />
    </button>
  );
}
