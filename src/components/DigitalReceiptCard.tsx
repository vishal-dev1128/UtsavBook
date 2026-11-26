import {
  Download,
  Image as ImageIcon,
  MessageCircle,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import {
  buildWhatsAppReceiptMessage,
  formatINR,
  formatReceiptDate,
  numberToIndianWords,
} from '../lib/i18n';
import {
  renderMinimalReceiptToImage,
  shareReceiptWithImageOnWhatsApp,
} from '../lib/receiptService';
import {
  Language,
  LedgerEntry,
  Mandal,
  resolveMandalLogoUrl,
  Utsav,
} from '../types';
import { WhatsAppStatusBadge } from './WhatsAppStatusBadge';

export interface OrnateReceiptProps {
  mandal: Mandal;
  utsavName: string;
  entry: LedgerEntry;
  onResendWhatsApp?: (lang: Language) => Promise<string | void>;
  defaultLanguage?: Language;
  showActions?: boolean;
  isTemplate?: boolean;
}

async function dataUrlToFile(dataUrl: string, filename: string, mimeType: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: mimeType });
}

export function OrnateReceipt({
  mandal,
  utsavName,
  entry,
  onResendWhatsApp,
  defaultLanguage = 'en',
  showActions = true,
  isTemplate = false,
}: OrnateReceiptProps) {
  const [exportState, setExportState] = useState<'idle' | 'jpeg' | 'sharing'>('idle');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [waSharing, setWaSharing] = useState(false);
  const waLang: Language = defaultLanguage;

  const publicId = entry.publicReceiptId || entry.id;
  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${publicId}`
      : `/verify/${publicId}`;
  const publicLedgerUrl =
    typeof window !== 'undefined' && mandal.joinCode
      ? `${window.location.origin}/m/${mandal.joinCode}`
      : undefined;

  const isGoods = !isTemplate && entry.type === 'goods';
  const receiptNo = isTemplate
    ? `${mandal.receiptPrefix}-____`
    : entry.receiptNumber || `${mandal.receiptPrefix}-0001`;
  const logoSrc = resolveMandalLogoUrl(mandal.logoUrl);
  const safeDonorSlug = (entry.titleOrDonorName || 'receipt')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '');
  const baseFilename = isTemplate
    ? `${mandal.receiptPrefix || 'receipt'}-template`
    : `${receiptNo}-${safeDonorSlug || 'receipt'}`;

  const renderFastImage = async (format: 'jpeg' | 'png') =>
    renderMinimalReceiptToImage({
      mandal,
      utsavName,
      entry,
      format,
      isTemplate,
      signatoryName: isTemplate ? 'Authorized Signatory' : entry.createdByName || 'Authorized Signatory',
    });

  const handleDownloadJpeg = async () => {
    setShareFeedback(null);
    try {
      setExportState('jpeg');
      const { dataUrl } = await renderFastImage('jpeg');
      const link = document.createElement('a');
      link.download = `${baseFilename}.jpg`;
      link.href = dataUrl;
      link.click();
      setShareFeedback('JPEG receipt saved.');
    } catch {
      setShareFeedback('Could not export JPEG receipt.');
    } finally {
      setExportState('idle');
    }
  };

  const buildMsg = (imageUrl?: string, forAttachedImage = true) =>
    buildWhatsAppReceiptMessage({
      donorName: entry.titleOrDonorName,
      mandalName: mandal.name,
      utsavName,
      amount: entry.amount,
      receiptNumber: receiptNo,
      verifyUrl,
      receiptImageUrl: imageUrl,
      flatOrAddress: entry.flatOrAddress,
      language: waLang,
      paymentMode: entry.paymentMode,
      upiTransactionId: entry.upiTransactionId,
      type: entry.type,
      goodsDescription: entry.goodsDescription,
      quantity: entry.quantity,
      estimatedValue: entry.estimatedValue,
      publicLedgerUrl,
      forAttachedImage,
    });

  const handleShareJpeg = async () => {
    setShareFeedback(null);
    const message = buildMsg(entry.receiptImageUrl, true);

    try {
      setExportState('sharing');
      const { dataUrl } = await renderFastImage('jpeg');
      const jpegFile = await dataUrlToFile(dataUrl, `${baseFilename}.jpg`, 'image/jpeg');

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [jpegFile] })
      ) {
        await navigator.share({
          title: `${mandal.name} Receipt #${receiptNo}`,
          text: message,
          files: [jpegFile],
        });
        setShareFeedback('Receipt JPEG + Thank You message shared.');
        return;
      }

      const link = document.createElement('a');
      link.download = `${baseFilename}.jpg`;
      link.href = dataUrl;
      link.click();

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `${mandal.name} Receipt #${receiptNo}`,
            text: buildMsg(entry.receiptImageUrl, false),
            url: verifyUrl,
          });
          setShareFeedback('JPEG saved and link shared.');
          return;
        } catch {
          // Dismissed native share sheet after saving JPEG
        }
      }
      setShareFeedback('JPEG saved — attach directly in WhatsApp.');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setShareFeedback('Could not generate JPEG for sharing.');
    } finally {
      setExportState('idle');
    }
  };

  const handleWhatsAppShare = async () => {
    if (waSharing) return;
    setWaSharing(true);
    setShareFeedback(null);
    try {
      const result = await shareReceiptWithImageOnWhatsApp({
        mandal,
        utsavName,
        entry,
        language: waLang,
      });

      if (result.status === 'shared_with_image') {
        setShareFeedback('Receipt attached with Thank You message!');
        if (onResendWhatsApp) {
          void onResendWhatsApp(waLang);
        }
      } else if (result.status === 'downloaded_and_opened_wa') {
        setShareFeedback('Receipt saved & copied — paste/attach in WhatsApp!');
        if (onResendWhatsApp) {
          void onResendWhatsApp(waLang);
        }
      }
    } finally {
      setWaSharing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Minimal Digital Receipt Card */}
      <div
        data-minimal-receipt-card="true"
        className="print-only-container relative overflow-hidden rounded-[28px] bg-[#FFFEFB] border border-slate-200/90 ring-1 ring-slate-900/[0.04] shadow-[0_20px_44px_-14px_rgba(15,23,42,0.14),0_6px_16px_-4px_rgba(15,23,42,0.06)] text-slate-900"
      >
        {/* Voided Stamp */}
        {entry.isVoided && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="border-4 border-[#DC2626] text-[#DC2626] px-6 py-2 rounded-xl font-extrabold text-2xl tracking-widest -rotate-12 bg-white/95 shadow-sm">
              VOID / CANCELLED
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-5">
          {/* Top Status Pill & Receipt Number */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded-full border whitespace-nowrap leading-none ${
                isGoods
                  ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
              }`}
            >
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>
                {isTemplate
                  ? 'Official Receipt'
                  : isGoods
                    ? 'Vastu Daan Receipt'
                    : 'Official E-Receipt'}
              </span>
            </span>
            <span className="text-xs font-mono font-extrabold text-slate-700 bg-slate-100/90 border border-slate-200/70 px-2.5 py-1.5 rounded-lg whitespace-nowrap leading-none truncate min-w-0 tabular-nums">
              #{receiptNo}
            </span>
          </div>

          {/* Mandal Identity Header */}
          <div className="flex flex-col items-center text-center gap-2.5 pt-1">
            {logoSrc && !logoFailed ? (
              <div className="w-16 h-16 rounded-full p-1 bg-white border border-slate-200/90 shadow-sm shrink-0">
                <img
                  src={logoSrc}
                  alt={mandal.name}
                  crossOrigin={
                    logoSrc.startsWith('data:') || logoSrc.startsWith('blob:')
                      ? undefined
                      : 'anonymous'
                  }
                  onError={() => setLogoFailed(true)}
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-extrabold text-lg shrink-0">
                {mandal.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-1 w-full min-w-0 px-1">
              <h4 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug break-words">
                {mandal.name}
              </h4>
              {mandal.localName && (
                <p className="text-xs font-semibold text-blue-700 font-devanagari leading-snug break-words">
                  {mandal.localName}
                </p>
              )}
              <p className="text-[11px] text-slate-500 leading-relaxed break-words">
                {[mandal.address, mandal.estYear ? `Est. ${mandal.estYear}` : '']
                  .filter(Boolean)
                  .join(' · ') || utsavName}
              </p>
            </div>
          </div>

          {/* Subtle Perforated Receipt Divider */}
          <div className="w-full border-t border-dashed border-slate-200" />

          {/* Amount / Vastu Daan Highlight Box */}
          <div
            className={`rounded-2xl border shadow-[0_4px_14px_-4px_rgba(15,23,42,0.06)] px-4 py-4 flex flex-col items-center text-center gap-1.5 ${
              isGoods
                ? 'bg-gradient-to-b from-slate-50/90 to-amber-50/45 border-amber-200/80'
                : 'bg-gradient-to-b from-slate-50/90 to-blue-50/40 border-slate-200/80'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none">
              {isGoods ? 'Vastu Daan / In-Kind Contribution' : 'Vargani / Contribution Received'}
            </div>

            {isTemplate ? (
              <>
                <div className="flex items-baseline justify-center gap-1.5 pt-1">
                  <span className="text-2xl font-extrabold text-slate-900 leading-none">₹</span>
                  <span className="inline-block w-32 border-b-2 border-dashed border-slate-400/80 h-6" />
                </div>
                <div className="text-[11px] font-semibold text-slate-600 leading-none pt-1">
                  Mode: ☐ Cash · ☐ UPI  ·  Date: ___ / ___ / 20___
                </div>
              </>
            ) : isGoods ? (
              <>
                <div className="text-lg font-extrabold text-amber-900 leading-snug">
                  {entry.goodsDescription || 'Vastu Daan'}
                  {entry.quantity ? ` (${entry.quantity})` : ''}
                </div>
                <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-800 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>
                    {entry.estimatedValue && entry.estimatedValue > 0
                      ? `Est. ${formatINR(entry.estimatedValue)} · `
                      : ''}
                    {formatReceiptDate(entry.entryDate)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums tracking-tight leading-none">
                  ₹{new Intl.NumberFormat('en-IN').format(entry.amount)}
                </div>
                <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    Paid via {entry.paymentMode} · {formatReceiptDate(entry.entryDate)}
                  </span>
                </div>
                {entry.upiTransactionId && (
                  <div className="text-[10.5px] font-mono text-slate-600 pt-0.5">
                    UTR / Ref: <span className="font-bold text-slate-900">{entry.upiTransactionId}</span>
                  </div>
                )}
                <p className="text-[10.5px] font-semibold text-slate-500 leading-snug pt-1">
                  {numberToIndianWords(entry.amount)}
                </p>
              </>
            )}
          </div>

          {/* Donor Details Grid */}
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs px-0.5">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                Received From
              </div>
              {isTemplate ? (
                <div className="mt-2.5 border-b border-dashed border-slate-300 h-4 w-full" />
              ) : (
                <div className="font-extrabold text-slate-900 mt-1.5 truncate">
                  {entry.titleOrDonorName}
                </div>
              )}
            </div>
            <div className="text-right min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                Flat / Wing
              </div>
              {isTemplate ? (
                <div className="mt-2.5 border-b border-dashed border-slate-300 h-4 w-24 ml-auto" />
              ) : (
                <div className="font-bold text-slate-700 mt-1.5 truncate">
                  {entry.flatOrAddress || '—'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                Utsav Cycle
              </div>
              <div className="font-bold text-slate-700 mt-1.5 truncate">{utsavName}</div>
            </div>
            <div className="text-right min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                Category
              </div>
              {isTemplate ? (
                <div className="mt-2.5 border-b border-dashed border-slate-300 h-4 w-24 ml-auto" />
              ) : (
                <div className="font-bold text-slate-700 mt-1.5 truncate">
                  {entry.head || 'Vargani / Chanda'}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Verified Stamp, QR & Signature */}
          <div className="pt-4 border-t border-slate-100 flex items-end justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {!isTemplate ? (
                <div className="p-1 bg-white rounded-xl border border-slate-200/80 shadow-2xs shrink-0">
                  <QRCodeSVG value={verifyUrl} size={42} level="M" fgColor="#0F172A" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold text-slate-800 leading-tight">
                  {isTemplate ? 'Official Receipt' : 'Digitally Verified'}
                </div>
                <div className="text-[10px] font-medium text-slate-400 mt-0.5 leading-tight break-words">
                  {isTemplate
                    ? 'Thank you for donating'
                    : `By ${entry.createdByName}`}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center text-center shrink-0 w-28">
              <div className="h-12 w-full flex items-end justify-center mb-1">
                {mandal.signatureUrl && (
                  <img
                    src={mandal.signatureUrl}
                    alt="Authorized signature"
                    crossOrigin={
                      mandal.signatureUrl.startsWith('data:') ||
                      mandal.signatureUrl.startsWith('blob:')
                        ? undefined
                        : 'anonymous'
                    }
                    referrerPolicy="no-referrer"
                    className="max-h-12 max-w-full object-contain bg-transparent"
                  />
                )}
              </div>
              <div className="w-full text-[10.5px] font-bold text-slate-600 border-t border-slate-200 pt-1.5 px-1 truncate leading-none">
                {isTemplate
                  ? 'Authorized Signatory'
                  : entry.createdByName || 'Authorized Signatory'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share & Export Actions */}
      {showActions && (
        <div className="no-print space-y-2.5">
          {/* Primary WhatsApp Image + Thank You Share CTA */}
          <button
            type="button"
            disabled={waSharing}
            onClick={handleWhatsAppShare}
            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] active:scale-[0.99] text-white text-[13px] font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>{waSharing ? 'Attaching Receipt...' : 'Share on WhatsApp'}</span>
          </button>

          {/* Balanced 2-Column JPEG Export & Share */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareJpeg}
              disabled={exportState !== 'idle'}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-2xs whitespace-nowrap disabled:opacity-60 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>{exportState === 'sharing' ? 'Preparing...' : 'Share JPEG'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJpeg}
              disabled={exportState !== 'idle'}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-100 active:scale-[0.99] transition-all whitespace-nowrap disabled:opacity-60 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{exportState === 'jpeg' ? 'Saving...' : 'Save JPEG'}</span>
            </button>
          </div>
        </div>
      )}

      {shareFeedback && (
        <div className="no-print flex items-center gap-1.5 text-xs text-blue-700 font-medium px-1">
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {!isTemplate &&
        entry.type === 'income' &&
        entry.whatsappStatus &&
        entry.whatsappStatus !== 'not_sent' && (
          <div className="no-print flex items-center justify-between gap-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/85 px-3.5 py-2.5 text-xs shadow-2xs">
            <div className="shrink-0">
              <WhatsAppStatusBadge
                status={entry.whatsappStatus}
                error={entry.whatsappError}
                showNotSent={false}
              />
            </div>
            <span
              className={`text-[11.5px] font-semibold text-right leading-snug ${
                entry.whatsappStatus === 'failed'
                  ? 'text-rose-700'
                  : entry.whatsappStatus === 'pending'
                    ? 'text-amber-800'
                    : entry.whatsappStatus === 'sent'
                      ? 'text-blue-700'
                      : 'text-emerald-700'
              }`}
            >
              {entry.whatsappStatus === 'pending'
                ? 'Preparing receipt...'
                : entry.whatsappStatus === 'sent'
                  ? 'Shared via 1-Click WhatsApp'
                  : entry.whatsappStatus === 'delivered'
                    ? 'WhatsApp receipt delivered'
                    : entry.whatsappError || 'Could not share receipt'}
            </span>
          </div>
        )}
    </div>
  );
}

export const DigitalReceiptCard = OrnateReceipt;
export default OrnateReceipt;

export function buildUpiPaymentUri(mandal: Mandal, amount?: number, donorName?: string): string {
  const pa = encodeURIComponent(mandal.upiId || 'mandalbook@upi');
  const pn = encodeURIComponent(mandal.name);
  const tn = encodeURIComponent(donorName ? `Vargani - ${donorName}` : `${mandal.name} Vargani`);
  const amPart = amount && amount > 0 ? `&am=${amount}` : '';
  return `upi://pay?pa=${pa}&pn=${pn}&tn=${tn}${amPart}&cu=INR`;
}

export function formatUtsavLabel(utsav: Utsav | null): string {
  if (!utsav) return 'Ganeshotsav';
  return `${utsav.name} · ${utsav.yearCycle}`;
}