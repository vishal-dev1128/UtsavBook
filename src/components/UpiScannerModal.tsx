import { BadgeCheck, QrCode, ShieldCheck, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect } from 'react';
import { formatINR } from '../lib/i18n';
import { MANDAL_DEFAULT_EMBLEM, Mandal, resolveMandalLogoUrl, Utsav } from '../types';
import { buildUpiPaymentUri } from './DigitalReceiptCard';

interface UpiScannerModalProps {
  open: boolean;
  onClose: () => void;
  mandal: Mandal;
  activeUtsav: Utsav;
  amount?: number;
  donorName?: string;
  onOpenSettings?: () => void;
}

export function UpiScannerModal({
  open,
  onClose,
  mandal,
  activeUtsav,
  amount,
  donorName,
  onOpenSettings,
}: UpiScannerModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasUpiConfigured = Boolean(mandal.upiQrUrl || mandal.upiId);
  const validAmount = amount && amount > 0 ? amount : undefined;
  const varganiTitle = `${activeUtsav.name} Vargani`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${varganiTitle} UPI Scanner`}
      onClick={onClose}
      className="animate-modal-backdrop fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-sheet relative w-full max-w-[420px] rounded-[28px] bg-gradient-to-b from-[#EEF2F7] via-[#E3E8F0] to-[#D6DEE8] border border-white/85 p-4 sm:p-5 shadow-[0_28px_64px_-14px_rgba(15,23,42,0.55),inset_0_1px_0_rgba(255,255,255,0.95)] space-y-3.5 text-slate-900"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close UPI scanner"
          className="absolute -top-2.5 -right-2.5 w-9 h-9 rounded-full bg-white hover:bg-slate-100 active:scale-90 border border-slate-200/90 text-slate-700 shadow-lg flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header: Logo + Event Title + Organizer + Metallic Seal */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={resolveMandalLogoUrl(mandal.logoUrl)}
              alt={mandal.name}
              onError={(e) => {
                if (!e.currentTarget.src.endsWith(MANDAL_DEFAULT_EMBLEM)) {
                  e.currentTarget.src = MANDAL_DEFAULT_EMBLEM;
                }
              }}
              className="w-11 h-11 rounded-full object-cover bg-slate-900 ring-2 ring-white/90 shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <h2 className="text-[17px] font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                {varganiTitle}
              </h2>
              <p className="text-xs font-medium text-slate-600 truncate mt-0.5">
                Organized by: {mandal.name}
              </p>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 border border-white/75 shadow-[inset_0_1px_2px_rgba(255,255,255,0.85),0_2px_6px_rgba(15,23,42,0.16)] flex items-center justify-center shrink-0"
          >
            <BadgeCheck className="w-4 h-4 text-slate-700" />
          </div>
        </div>

        {/* Frosted Glassmorphic QR Plate */}
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-b from-white/95 via-[#F8FAFC]/95 to-[#E5ECF4]/95 border border-white px-3.5 pt-4 pb-5 sm:px-5 sm:pt-5 sm:pb-5 shadow-[0_14px_34px_-10px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,1)]">
          {hasUpiConfigured ? (
            <>
              <div className="relative w-full max-w-[300px] aspect-square mx-auto flex items-center justify-center">
                {mandal.upiQrUrl ? (
                  <img
                    src={mandal.upiQrUrl}
                    alt="Mandal UPI QR"
                    className="w-full h-full object-contain rounded-2xl"
                  />
                ) : (
                  <QRCodeSVG
                    value={buildUpiPaymentUri(mandal, validAmount, donorName)}
                    size={288}
                    level="H"
                    bgColor="transparent"
                    fgColor="#1E293B"
                    className="w-full h-full"
                  />
                )}

                {/* Centered Brushed-Silver Coin Badge */}
                {!mandal.upiQrUrl && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white via-slate-300 to-slate-500 p-[3px] shadow-[0_6px_18px_rgba(15,23,42,0.34)]">
                      <div className="w-full h-full rounded-full bg-gradient-to-b from-[#F8FAFC] via-[#CBD5E1] to-[#E2E8F0] border border-white/85 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-7.5 h-7.5" aria-hidden="true">
                          <path
                            d="M15.8 5.2a3.3 3.3 0 0 1 4.6 4.6l-3.9 3.9a2 2 0 0 1-2.8-2.8l3.2-3.2"
                            fill="none"
                            stroke="#16A34A"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M12.2 4.6a3.3 3.3 0 0 0-4.6 0L3.9 8.3a3.3 3.3 0 0 0 4.6 4.6l1.7-1.7"
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M8.2 18.8a3.3 3.3 0 0 1-4.6-4.6l3.9-3.9a2 2 0 0 1 2.8 2.8l-3.2 3.2"
                            fill="none"
                            stroke="#F59E0B"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M11.8 19.4a3.3 3.3 0 0 0 4.6 0l3.7-3.7a3.3 3.3 0 0 0-4.6-4.6l-1.7 1.7"
                            fill="none"
                            stroke="#EF4444"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3.5 text-center space-y-0.5 px-2 pb-3">
                {mandal.upiId && (
                  <div className="text-[13px] font-bold text-slate-800 tracking-tight break-all">
                    UPI ID: {mandal.upiId}
                  </div>
                )}
                <div className="text-[13px] font-semibold text-slate-700 truncate">
                  For: {varganiTitle}
                </div>
                {validAmount && (
                  <div className="pt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-800 text-[11px] font-extrabold tabular-nums">
                      Amount: {formatINR(validAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom-Right Secure Payment Corner Badge */}
              <div className="pointer-events-none absolute bottom-0 right-0 bg-gradient-to-tl from-[#94A3B8]/80 via-[#CBD5E1]/90 to-[#E2E8F0]/90 text-slate-800 pl-3 pr-2.5 py-1.5 rounded-tl-xl border-t border-l border-white/85 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                <span className="text-[7.5px] font-extrabold uppercase leading-[1.05] tracking-wider text-left">
                  SECURE
                  <br />
                  PAYMENT
                </span>
              </div>
            </>
          ) : (
            <div className="py-8 px-3 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-200/80 text-slate-600 flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-extrabold text-slate-900">UPI ID Not Configured</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Add your Mandal UPI ID or custom QR image in Mandal Details to display the live
                  scanner here.
                </p>
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="h-9 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-extrabold transition-colors"
                >
                  Add UPI ID in Settings
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Caption & Done Action */}
        <div className="space-y-2.5">
          <p className="text-center text-[13px] font-medium text-slate-700">
            Scan to pay with any UPI app
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-extrabold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
