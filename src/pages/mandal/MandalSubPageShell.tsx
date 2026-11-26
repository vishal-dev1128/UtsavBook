import { ChevronLeft } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface MandalSubPageShellProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export function MandalSubPageShell({
  title,
  subtitle,
  backTo = '/mandal',
  onBack,
  rightAction,
  children,
}: MandalSubPageShellProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    const historyIdx =
      typeof window !== 'undefined' &&
      typeof window.history.state?.idx === 'number'
        ? window.history.state.idx
        : 0;

    if (historyIdx > 0) {
      navigate(-1);
    } else {
      navigate(backTo, { replace: true });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-full bg-[#F5F7FB] text-slate-900 overscroll-y-contain selection:bg-blue-600/15">
      <header className="sticky top-0 z-20 bg-[#F5F7FB]/85 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="w-10 h-10 rounded-2xl bg-white/95 border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-90 transition-all shrink-0 cursor-pointer touch-manipulation"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[17px] font-extrabold text-slate-900 tracking-tight truncate leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {rightAction && <div className="shrink-0">{rightAction}</div>}
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10 space-y-4">
        {children}
      </main>
    </div>
  );
}