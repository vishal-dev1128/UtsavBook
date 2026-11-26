export type Language = 'en' | 'mr' | 'hi';

export type MemberRole = 'admin' | 'collector' | 'auditor';

export type TierName = 'Free' | 'Bronze' | 'Silver' | 'Gold';

export type EntryType = 'income' | 'expense' | 'goods';

export type PaymentMode = 'CASH' | 'UPI' | 'BANK' | 'GOODS';

export type WhatsAppStatus = 'not_sent' | 'pending' | 'sent' | 'delivered' | 'failed';

export type ApprovalStatus = 'approved' | 'pending';

export interface Mandal {
  id: string;
  user_id: string;
  name: string;
  localName?: string;
  subtitle?: string;
  address?: string;
  estYear: string;
  logoUrl?: string;
  signatureUrl?: string;
  upiId?: string;
  upiQrUrl?: string;
  receiptPrefix: string;
  joinCode: string;
  tierName: TierName;
  whatsappCredits: number;
  whatsapp_credits?: number;
  isVerified: boolean;
  showDonorsPublic: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MandalMember {
  uid: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  role: MemberRole;
  cashInHand: number;
  status: 'active' | 'suspended';
  joinedAt: string;
}

export interface Utsav {
  id: string;
  user_id: string;
  name: string;
  yearCycle: string;
  lastReceiptSeq: number;
  totalCollected: number;
  totalSpent: number;
  categoryBudgets?: Record<string, number>;
  isActive: boolean;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  utsavId: string;
  type: EntryType;
  receiptNumber?: string;
  publicReceiptId?: string;
  titleOrDonorName: string;
  flatOrAddress?: string;
  donorPhone?: string;
  head: string;
  amount: number;
  goodsDescription?: string;
  quantity?: string;
  estimatedValue?: number;
  paymentMode: PaymentMode;
  upiTransactionId?: string;
  isAnonymous?: boolean;
  billPhotoUrl?: string;
  receiptImageUrl?: string;
  note?: string;
  whatsappStatus: WhatsAppStatus;
  whatsappMessageId?: string;
  whatsappError?: string;
  approvalStatus: ApprovalStatus;
  createdByUid: string;
  createdByName: string;
  isVoided: boolean;
  voidedAt?: string;
  entryDate: string; // YYYY-MM-DD
  createdAt: string; // ISO string
}

export interface DonationRecord {
  id?: string;
  user_id: string;
  mandalId: string;
  utsavId: string;
  entryId: string;
  donorName: string;
  flatNo: string;
  phone: string;
  amount: number;
  mode: PaymentMode;
  category: string;
  utsavCycle: string;
  mandalName: string;
  receiptNo: string;
  receiptImageUrl: string;
  whatsappStatus: WhatsAppStatus;
  whatsappMessageId?: string;
  whatsappError?: string;
  creditDeducted?: boolean;
  createdAt: string;
}

export interface NakashaUnit {
  id: string;
  user_id: string;
  wingName: string;
  flatNumber: string;
  residentName: string;
  phone?: string;
  status: 'pending' | 'collected' | 'not_home' | 'skipped';
  donationAmount: number;
  assignedCollectorUid?: string;
  assignedCollectorName?: string;
}

export interface Vendor {
  id: string;
  user_id: string;
  utsavId: string;
  name: string;
  category: string;
  phone?: string;
  totalContract: number;
  advancePaid: number;
  dueDate?: string;
  note?: string;
  status: 'pending' | 'partial' | 'paid';
  createdAt: string;
  updatedAt: string;
}

export interface MandalEvent {
  id: string;
  user_id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  description?: string;
  location?: string;
}

export interface MandalDocument {
  id: string;
  user_id: string;
  title: string;
  category: string;
  fileUrl?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface CashHandover {
  id: string;
  user_id: string;
  utsavId: string;
  collectorUid: string;
  collectorName: string;
  amount: number;
  status: 'pending' | 'confirmed';
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'signup_bonus' | 'pack_purchase' | 'receipt_sent' | 'failed_refund';
  creditsDelta: number;
  amountInr: number;
  packName?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  pack_name: string;
  credits_added: number;
  amount_paid: number;
  payment_ref: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entryId: string;
  summary: string;
  beforeData?: string;
  afterData?: string;
  performedByUid: string;
  performedByName: string;
  timestamp: string;
}

export interface PublicReceipt {
  publicReceiptId: string;
  user_id: string;
  mandalId: string;
  mandalName: string;
  mandalAddress?: string;
  estYear?: string;
  logoUrl?: string;
  utsavName: string;
  receiptNumber: string;
  donorName: string;
  flatOrAddress?: string;
  amount: number;
  paymentMode: string;
  upiTransactionId?: string;
  isAnonymous?: boolean;
  date: string;
  receiptImageUrl?: string;
  isVerified?: boolean;
  isVoided: boolean;
}

export interface PublicMandalSnapshot {
  joinCode: string;
  user_id: string;
  mandalId: string;
  mandalName: string;
  address?: string;
  estYear?: string;
  logoUrl?: string;
  isVerified?: boolean;
  utsavName: string;
  yearCycle?: string;
  totalCollected: number;
  totalSpent: number;
  showDonorsPublic: boolean;
  categoryBreakdown: { head: string; total: number }[];
  publicDonors?: {
    donorName: string;
    flatOrAddress?: string;
    amount: number;
    entryDate: string;
    receiptNumber?: string;
  }[];
  publicGoods?: {
    donorName: string;
    flatOrAddress?: string;
    goodsDescription?: string;
    head: string;
    estimatedValue?: number;
    quantity?: string;
    entryDate: string;
    isAnonymous?: boolean;
  }[];
  updatedAt: string;
}

export interface ReceiptPack {
  id: string;
  name: string;
  credits: number;
  priceInr: number;
  tierGrant: TierName;
  perReceiptCost: string;
  badge?: string;
}

export const INCOME_HEADS = [
  'Vargani / Chanda',
  'Aarti Plate',
  'Prasad Sponsorship',
  'Mandal Member Contribution',
  'Banner / Sponsor',
  'Auction / Ladoo Prasad',
  'Other Income',
] as const;

export const EXPENSE_HEADS = [
  'Murti',
  'Mandap & Decoration',
  'Lighting & Bijli',
  'Sound & DJ',
  'Aarti & Pooja Samagri',
  'Prasad & Bhandara',
  'Cultural Programs',
  'Visarjan & Transport',
  'Printing & Receipts',
  'Other',
] as const;

export const GOODS_HEADS = [
  'Prasad & Modak',
  'Pooja Samagri',
  'Flowers & Garland',
  'Decoration Material',
  'Sound / Lighting Sponsorship',
  'Other In-Kind',
] as const;

export const VENDOR_CATEGORIES = [
  'Mandap & Decoration',
  'Murti / Idol',
  'Sound & DJ',
  'Lighting & Electrical',
  'Catering & Prasad',
  'Photography & Media',
  'Transport & Logistics',
  'Printing & Flex',
  'Other Vendor',
] as const;

export const RECEIPT_PACKS: ReceiptPack[] = [
  {
    id: 'pack_starter_100',
    name: 'Starter Pack',
    credits: 100,
    priceInr: 99,
    tierGrant: 'Bronze',
    perReceiptCost: '₹0.99/receipt',
  },
  {
    id: 'pack_utsav_300',
    name: 'Utsav Pack',
    credits: 300,
    priceInr: 249,
    tierGrant: 'Silver',
    perReceiptCost: '₹0.83/receipt • Save 17%',
    badge: 'Most Popular',
  },
  {
    id: 'pack_mega_700',
    name: 'Mega Mandal Pack',
    credits: 700,
    priceInr: 499,
    tierGrant: 'Gold',
    perReceiptCost: '₹0.71/receipt • Save 29%',
    badge: 'Best Value',
  },
];

export const DEFAULT_TRIAL_WHATSAPP_CREDITS = 5;

export function getAvailableWhatsAppCredits(mandal?: Pick<Mandal, 'whatsappCredits' | 'whatsapp_credits'> | null): number {
  if (!mandal) return 0;
  return Math.max(0, Math.floor(Number(mandal.whatsapp_credits ?? mandal.whatsappCredits ?? 0)));
}

export const MANDAL_DEFAULT_EMBLEM = '/logo-icon.png';

export function resolveMandalLogoUrl(url?: string | null): string {
  const clean = (url || '').trim();
  if (!clean || clean.startsWith('/src/assets/images/')) {
    return MANDAL_DEFAULT_EMBLEM;
  }
  return clean;
}

