import { CheckCircle2, Download, Share, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Installed as App</span>
      </div>
    );
  }

  const handleInstall = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIOS) {
      setShowIosGuide((prev) => !prev);
    } else {
      setShowIosGuide((prev) => !prev);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleInstall}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0'
            : 'w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-bold hover:bg-[#1D4ED8] transition-colors shadow-sm'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install UtsavBook App</span>
      </button>

      {showIosGuide && (
        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-blue-900">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Add to Home Screen</span>
          </div>
          {isIOS ? (
            <p className="leading-relaxed">
              Tap <Share className="w-3.5 h-3.5 inline text-[#2563EB]" /> Share in Safari and select{' '}
              <strong>Add to Home Screen</strong> for instant offline access.
            </p>
          ) : (
            <p className="leading-relaxed">
              Open your browser menu (⋮) and tap <strong>Install app</strong> or{' '}
              <strong>Add to Home screen</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
