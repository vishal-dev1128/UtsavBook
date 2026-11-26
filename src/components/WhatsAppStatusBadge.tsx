import { Check, CheckCheck, Clock, XCircle } from 'lucide-react';
import { WhatsAppStatus } from '../types';

export interface WhatsAppStatusBadgeProps {
  status?: WhatsAppStatus | null;
  error?: string;
  compact?: boolean;
  showNotSent?: boolean;
}

export function WhatsAppStatusBadge({
  status,
  error,
  compact = false,
  showNotSent = false,
}: WhatsAppStatusBadgeProps) {
  if (!status || (status === 'not_sent' && !showNotSent)) {
    return null;
  }

  if (status === 'pending') {
    return (
      <span
        title="Queued for automatic WhatsApp receipt delivery"
        className={`inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/90 text-amber-800 font-bold shrink-0 ${
          compact ? 'px-1.5 py-0.5 text-[9.5px]' : 'px-2.5 py-1 text-[11px]'
        }`}
      >
        <Clock className={`${compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} animate-pulse shrink-0`} />
        <span>Pending</span>
      </span>
    );
  }

  if (status === 'sent') {
    return (
      <span
        title="WhatsApp receipt shared"
        className={`inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/90 text-blue-700 font-bold shrink-0 ${
          compact ? 'px-1.5 py-0.5 text-[9.5px]' : 'px-2.5 py-1 text-[11px]'
        }`}
      >
        <Check className={`${compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} shrink-0`} />
        <span>Shared</span>
      </span>
    );
  }

  if (status === 'delivered') {
    return (
      <span
        title="WhatsApp receipt delivered"
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-700 font-bold shrink-0 ${
          compact ? 'px-1.5 py-0.5 text-[9.5px]' : 'px-2.5 py-1 text-[11px]'
        }`}
      >
        <CheckCheck className={`${compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} shrink-0`} />
        <span>Delivered</span>
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span
        title={error || 'WhatsApp delivery failed'}
        className={`inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/90 text-rose-700 font-bold shrink-0 ${
          compact ? 'px-1.5 py-0.5 text-[9.5px]' : 'px-2.5 py-1 text-[11px]'
        }`}
      >
        <XCircle className={`${compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} shrink-0`} />
        <span>Failed</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-semibold shrink-0 ${
        compact ? 'px-1.5 py-0.5 text-[9.5px]' : 'px-2.5 py-1 text-[11px]'
      }`}
    >
      <span>Not Sent</span>
    </span>
  );
}
