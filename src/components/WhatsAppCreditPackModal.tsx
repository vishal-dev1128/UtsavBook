import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Lock,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useState } from 'react';
import { useMandal } from '../context/MandalContext';
import { formatINR } from '../lib/i18n';
import { getAvailableWhatsAppCredits, RECEIPT_PACKS } from '../types';
import { SlidingPillTabs } from './SlidingControls';

interface WhatsAppCreditPackModalProps {
  open: boolean;
  onClose: () => void;
  onPurchased?: (creditsAdded: number) => void;
  onContinueWithoutWhatsApp?: () => void;
  initialPackId?: string;
}

const DEFAULT_PACK_ID = 'pack_utsav_300';

export function WhatsAppCreditPackModal({
  open,
  onClose,
  onPurchased,
  onContinueWithoutWhatsApp,
  initialPackId = DEFAULT_PACK_ID,
}: WhatsAppCreditPackModalProps) {
  const { mandal, effectiveRole, purchaseReceiptPack, showToast } = useMandal();

  const [selectedPackId, setSelectedPackId] = useState<string>(initialPackId);
  const [step, setStep] = useState<'select' | 'checkout'>('select');
  const [payMethod, setPayMethod] = useState<'upi_utr' | 'razorpay'>('upi_utr');
  const [utrInput, setUtrInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedPackId(initialPackId || DEFAULT_PACK_ID);
    setStep('select');
    setPayMethod('upi_utr');
    setUtrInput('');
    setSubmitting(false);
    setErrorMsg(null);
    setCopiedUpi(false);
  }, [open, initialPackId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  if (!open || !mandal) return null;

  const selectedPack =
    RECEIPT_PACKS.find((p) => p.id === selectedPackId) ||
    RECEIPT_PACKS.find((p) => p.id === DEFAULT_PACK_ID) ||
    RECEIPT_PACKS[0];

  const availableCredits = getAvailableWhatsAppCredits(mandal);
  const isAdmin = effectiveRole === 'admin';
  const merchantUpiId = mandal.upiId?.trim() || 'mandalbook.pay@upi';
  const upiPayUri = `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(
    `${mandal.name} Credits`
  )}&am=${selectedPack.priceInr}&cu=INR&tn=${encodeURIComponent(
    `MandalBook ${selectedPack.name} (${selectedPack.credits} Receipts)`
  )}`;

  const cleanUtr = utrInput.replace(/\D/g, '').slice(0, 12);
  const isUtrValid = /^\d{12}$/.test(cleanUtr);

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(merchantUpiId);
      setCopiedUpi(true);
      showToast('UPI ID copied');
      window.setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      setErrorMsg('Copy failed — please enter UPI ID manually in your payment app.');
    }
  };

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!isAdmin) {
      setErrorMsg('Only a Mandal Admin can confirm credit pack purchases.');
      return;
    }

    if (payMethod === 'upi_utr' && !isUtrValid) {
      setErrorMsg('Please enter the valid 12-digit UTR reference number from your UPI app.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      const paymentRef =
        payMethod === 'upi_utr'
          ? `UTR_${cleanUtr}`
          : `pay_RZP_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      await purchaseReceiptPack(selectedPack.id, {
        paymentRef,
        paymentMethod: payMethod,
      });

      onPurchased?.(selectedPack.credits);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to verify payment right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueWithout = () => {
    if (submitting) return;
    onContinueWithoutWhatsApp?.();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-pack-modal-title"
      onClick={() => {
        if (!submitting) onClose();
      }}
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-sm p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-sheet relative w-full sm:max-w-[500px] max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[#F5F7FB] border border-slate-200/90 shadow-[0_24px_60px_-16px_rgba(15,23,42,0.3)] text-slate-900"
      >
        {/* Top Modal Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3 flex items-center justify-between gap-2.5">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {step === 'checkout' ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setErrorMsg(null);
                  setStep('select');
                }}
                aria-label="Back to packs"
                className="w-9 h-9 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-slate-700 hover:bg-blue-50 hover:text-blue-700 active:scale-95 flex items-center justify-center shrink-0 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 text-[#2563EB] flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2
                  id="wa-pack-modal-title"
                  className="text-[15px] font-extrabold text-slate-900 tracking-tight leading-tight truncate"
                >
                  Auto-Send WhatsApp Receipts
                </h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums shrink-0 leading-none ${
                    availableCredits > 10
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                      : availableCredits > 0
                        ? 'bg-amber-50 text-amber-800 border border-amber-300/80'
                        : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                  }`}
                >
                  {availableCredits} left
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug truncate">
                Build donor trust with instant receipts — under ₹1/receipt.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl bg-[#F5F7FB] border border-slate-200/90 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 flex items-center justify-center shrink-0 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {!isAdmin && (
            <div className="rounded-xl bg-amber-50 border border-amber-200/90 px-3 py-2 flex items-center gap-2 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Viewing as <strong className="capitalize">{effectiveRole}</strong>. Ask your Mandal
                Admin to recharge credits, or continue without WhatsApp.
              </span>
            </div>
          )}

          {step === 'select' ? (
            <div key="step-select" className="animate-step-swap space-y-3">
              {/* 3 Interactive Pack Selection Cards */}
              <div className="space-y-2" role="radiogroup" aria-label="WhatsApp credit packs">
                {RECEIPT_PACKS.map((pack, idx) => {
                  const isSelected = pack.id === selectedPack.id;
                  const isPopular = pack.badge === 'Most Popular';
                  const isBestValue = pack.badge === 'Best Value';

                  return (
                    <button
                      key={pack.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      style={{ animationDelay: `${idx * 40}ms` }}
                      onClick={() => setSelectedPackId(pack.id)}
                      className={`animate-page-in relative overflow-hidden w-full text-left rounded-2xl p-3 border-2 transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                        isSelected
                          ? 'bg-white border-[#2563EB]'
                          : 'bg-white/95 border-slate-200/90 hover:border-blue-300 hover:bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="pointer-events-none absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/70 to-transparent" />
                      )}

                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                            isSelected
                              ? 'border-[#2563EB] bg-[#2563EB] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[13px] font-extrabold text-slate-900 leading-tight">
                              {pack.name}
                            </span>
                            {pack.badge && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none shrink-0 ${
                                  isPopular
                                    ? 'bg-[#2563EB] text-white'
                                    : isBestValue
                                      ? 'bg-[#10B981] text-white'
                                      : 'bg-blue-50 text-blue-700'
                                }`}
                              >
                                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                <span>{pack.badge}</span>
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-600 mt-1 tabular-nums truncate">
                            <strong className="text-slate-900">{pack.credits} Receipts</strong>
                            <span className="mx-1.5 text-slate-300">·</span>
                            <span
                              className={
                                pack.perReceiptCost.includes('Save')
                                  ? 'font-bold text-emerald-600'
                                  : 'font-medium text-slate-600'
                              }
                            >
                              {pack.perReceiptCost}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-extrabold text-slate-900 tabular-nums leading-tight">
                          {formatINR(pack.priceInr)}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 leading-tight mt-0.5">
                          One-time
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Primary CTA */}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep('checkout');
                }}
                className="w-full h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-xs sm:text-sm font-bold transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
              >
                <span>Buy Selected Pack — {formatINR(selectedPack.priceInr)}</span>
              </button>
            </div>
          ) : (
            /* Step 2: Inline Payment Confirmation Step (UPI QR + 12-Digit UTR / Razorpay) */
            <form
              key="step-checkout"
              onSubmit={handleConfirmPurchase}
              className="animate-step-swap space-y-4"
            >
              {/* Selected Pack Summary Strip */}
              <div className="relative overflow-hidden rounded-2xl bg-white border border-blue-200/90 p-3.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="pointer-events-none absolute inset-x-6 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                    Selected Pack
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 truncate">
                    {selectedPack.name} · {selectedPack.credits} Receipts
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600">
                    {selectedPack.perReceiptCost}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                    {formatINR(selectedPack.priceInr)}
                  </div>
                </div>
              </div>

              {/* Website SlidingPillTabs Payment Method Switcher */}
              <SlidingPillTabs
                value={payMethod}
                onChange={(next) => {
                  setPayMethod(next);
                  setErrorMsg(null);
                }}
                tone="blue"
                size="md"
                ariaLabel="Payment method"
                options={[
                  { id: 'upi_utr', label: 'UPI QR + UTR', icon: <QrCode className="w-4 h-4" /> },
                  {
                    id: 'razorpay',
                    label: 'Razorpay Checkout',
                    icon: <CreditCard className="w-4 h-4" />,
                  },
                ]}
              />

              {payMethod === 'upi_utr' ? (
                <div className="animate-page-in rounded-2xl bg-white border border-slate-200/90 p-4 space-y-3.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="p-2.5 rounded-2xl bg-[#F5F7FB] border border-blue-200/80 shrink-0">
                      <QRCodeSVG value={upiPayUri} size={124} level="M" />
                    </div>
                    <div className="space-y-2 text-center sm:text-left min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-slate-900">
                        Scan &amp; Pay {formatINR(selectedPack.priceInr)} via any UPI App
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Supports GPay, PhonePe, Paytm &amp; BHIM. After payment, enter the 12-digit
                        UTR reference number below.
                      </p>
                      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#F5F7FB] border border-slate-200/80 max-w-full">
                        <span className="text-[11px] font-mono font-bold text-slate-800 truncate">
                          {merchantUpiId}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="text-[11px] font-bold text-[#2563EB] hover:text-[#1D4ED8] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedUpi ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="pack-utr-input"
                      className="block text-xs font-bold text-slate-700 mb-1.5"
                    >
                      12-Digit UPI UTR / Reference No. *
                    </label>
                    <input
                      id="pack-utr-input"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{12}"
                      maxLength={12}
                      placeholder="Enter 12-digit UTR (e.g. 429812345678)"
                      value={utrInput}
                      onChange={(e) => {
                        setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12));
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F5F7FB] border border-slate-200 text-sm font-mono font-bold tracking-wider text-slate-900 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 transition-all"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums">
                      <span className="text-slate-500">Numeric 12-digit bank reference</span>
                      <span
                        className={`font-bold ${
                          isUtrValid ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {cleanUtr.length}/12 digits
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-page-in rounded-2xl bg-white border border-slate-200/90 p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                    <span>Instant Razorpay Checkout Ready</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Credits are activated immediately upon confirmation and recorded in your Mandal
                    credit transaction log for audit transparency.
                  </p>
                  <div className="rounded-xl bg-[#F5F7FB] border border-slate-200/80 px-3 py-2 text-[11px] text-slate-600 flex items-center justify-between tabular-nums">
                    <span>UPI · Cards · NetBanking</span>
                    <strong className="text-slate-900">{formatINR(selectedPack.priceInr)}</strong>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !isAdmin || (payMethod === 'upi_utr' && !isUtrValid)}
                className="w-full min-h-[48px] px-4 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] disabled:opacity-50 text-white text-sm font-extrabold transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Verifying & Activating Credits...'
                    : payMethod === 'upi_utr'
                      ? `Verify UTR & Add ${selectedPack.credits} Credits`
                      : `Confirm Payment & Add ${selectedPack.credits} Credits`}
                </span>
              </button>
            </form>
          )}

          {/* Clean secondary text button at bottom */}
          <div className="pt-0.5 text-center">
            <button
              type="button"
              disabled={submitting}
              onClick={handleContinueWithout}
              className="min-h-[44px] px-4 inline-flex items-center justify-center text-xs font-bold text-slate-600 hover:text-[#2563EB] underline underline-offset-4 cursor-pointer transition-colors"
            >
              Continue Without WhatsApp Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
