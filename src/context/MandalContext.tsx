import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  DocumentData,
  DocumentSnapshot,
  enableNetwork,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { normalizeIndianPhone, normalizeWhatsAppPhone, t } from '../lib/i18n';
import { ImportedLedgerRow } from '../lib/ledgerImport';
import { queryClient } from '../lib/queryClient';
import {
  buildAutomatedWhatsAppDispatchPayload,
  generateAndUploadReceiptPng,
  ReceiptJpegUploadResult,
  shareReceiptWithImageOnWhatsApp,
} from '../lib/receiptService';
import { buildOptionalSampleData } from '../lib/sampleData';
import {
  AuditLog,
  CashHandover,
  CreditTransaction,
  DEFAULT_TRIAL_WHATSAPP_CREDITS,
  EntryType,
  getAvailableWhatsAppCredits,
  Language,
  LedgerEntry,
  MANDAL_DEFAULT_EMBLEM,
  Mandal,
  MandalDocument,
  MandalEvent,
  MandalMember,
  MemberRole,
  NakashaUnit,
  PaymentMode,
  RECEIPT_PACKS,
  resolveMandalLogoUrl,
  TierName,
  Utsav,
  Vendor,
  WalletTransaction,
} from '../types';

const LANG_STORAGE_KEY = 'mandalbook_lang_v1';

interface ToastState {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
  undoEntryId?: string;
}

export interface AddIncomeInput {
  donorName: string;
  flatOrAddress?: string;
  donorPhone?: string;
  head: string;
  amount: number;
  paymentMode: PaymentMode;
  upiTransactionId?: string;
  isAnonymous?: boolean;
  entryDate: string;
  note?: string;
  autoSendWhatsApp: boolean;
}

export interface AddExpenseInput {
  title: string;
  vendorOrNote?: string;
  head: string;
  amount: number;
  paymentMode: PaymentMode;
  entryDate: string;
  billPhotoUrl?: string;
  paidOutOfPocket?: boolean;
}

export interface AddGoodsInput {
  donorName: string;
  flatOrAddress?: string;
  donorPhone?: string;
  head: string;
  goodsDescription: string;
  quantity?: string;
  estimatedValue?: number;
  isAnonymous?: boolean;
  entryDate: string;
  note?: string;
}

export interface BudgetAlertItem {
  head: string;
  limit: number;
  spent: number;
  pct: number;
  level: 'warning' | 'exceeded';
}

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function cleanUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== '') {
      out[k] = v;
    }
  }
  return out;
}

function auditJson(obj: unknown): string {
  try {
    return JSON.stringify(obj).slice(0, 950);
  } catch {
    return String(obj).slice(0, 950);
  }
}

function computeNextTier(current: TierName, granted: TierName): TierName {
  const rank: Record<TierName, number> = { Free: 0, Bronze: 1, Silver: 2, Gold: 3 };
  return rank[granted] > rank[current] ? granted : current;
}

interface MandalContextValue {
  user: User | null;
  authReady: boolean;
  dataLoading: boolean;
  loadError: string | null;
  retryLoad: () => Promise<void>;
  needsOnboarding: boolean;
  mandal: Mandal | null;
  members: MandalMember[];
  currentMember: MandalMember | null;
  effectiveRole: MemberRole;
  simulatedRole: MemberRole | null;
  setSimulatedRole: (role: MemberRole | null) => void;
  utsavs: Utsav[];
  activeUtsav: Utsav | null;
  setActiveUtsavId: (id: string) => void;
  entries: LedgerEntry[];
  utsavEntries: LedgerEntry[];
  nakasha: NakashaUnit[];
  vendors: Vendor[];
  events: MandalEvent[];
  documents: MandalDocument[];
  handovers: CashHandover[];
  walletTransactions: WalletTransaction[];
  creditTransactions: CreditTransaction[];
  auditLogs: AuditLog[];
  language: Language;
  setLanguage: (lang: Language) => void;
  tr: (key: string) => string;
  privacyMasked: boolean;
  setPrivacyMasked: React.Dispatch<React.SetStateAction<boolean>>;
  toast: ToastState | null;
  showToast: (message: string, tone?: ToastState['tone'], undoEntryId?: string) => void;
  dismissToast: () => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  createMandal: (input: {
    name: string;
    localName?: string;
    address: string;
    estYear: string;
    utsavName: string;
    yearCycle: string;
    upiId?: string;
  }) => Promise<void>;
  loadSampleData: () => Promise<void>;
  joinMandalByCode: (code: string, memberName: string, phone?: string) => Promise<void>;
  createUtsav: (name: string, yearCycle: string) => Promise<void>;
  deleteUtsav: (utsavId: string) => Promise<void>;
  updateCategoryBudgets: (budgets: Record<string, number>) => Promise<void>;
  updateMandalSettings: (patch: Partial<Mandal>) => Promise<void>;
  findDuplicateIncome: (donorName: string, amount: number, entryDate: string) => LedgerEntry | undefined;
  addIncomeEntry: (input: AddIncomeInput) => Promise<LedgerEntry>;
  addExpenseEntry: (input: AddExpenseInput) => Promise<LedgerEntry>;
  addGoodsEntry: (input: AddGoodsInput) => Promise<LedgerEntry>;
  importEntriesBatch: (rows: ImportedLedgerRow[]) => Promise<number>;
  updateEntry: (entryId: string, patch: Partial<LedgerEntry>) => Promise<void>;
  voidEntry: (entryId: string) => Promise<void>;
  restoreEntry: (entryId: string) => Promise<void>;
  generateReceiptJpegUrl: (entry: LedgerEntry) => Promise<ReceiptJpegUploadResult>;
  resendWhatsAppReceipt: (entryId: string, updatedPhone?: string) => Promise<boolean>;
  sendAutomatedWhatsAppReceipt: (
    entry: LedgerEntry,
    updatedPhone?: string,
    languageOverride?: Language
  ) => Promise<{
    ok: boolean;
    receiptImageUrl?: string;
    whatsappMessage: string;
    whatsappUrl: string;
  }>;
  approvePendingExpense: (entryId: string) => Promise<void>;
  rejectPendingExpense: (entryId: string) => Promise<void>;
  requestCashHandover: (amount: number) => Promise<void>;
  approveCashHandover: (handoverId: string) => Promise<void>;
  updateMemberRole: (uid: string, role: MemberRole) => Promise<void>;
  purchaseReceiptPack: (
    packId: string,
    paymentDetails?: { paymentRef?: string; paymentMethod?: 'razorpay' | 'upi_utr' }
  ) => Promise<void>;
  clearWalletHistory: (resetCreditsToTrial?: boolean) => Promise<void>;
  deleteAllUtsavData: () => Promise<number>;
  upsertNakashaUnit: (unit: Omit<NakashaUnit, 'user_id'> & { user_id?: string }) => Promise<void>;
  bulkAddNakashaUnits: (units: Array<Omit<NakashaUnit, 'user_id'>>) => Promise<number>;
  deleteNakashaUnit: (unitId: string) => Promise<void>;
  addVendor: (input: {
    name: string;
    category: string;
    phone?: string;
    totalContract: number;
    advancePaid: number;
    dueDate?: string;
    note?: string;
  }) => Promise<void>;
  recordVendorPayment: (vendorId: string, additionalAmount: number) => Promise<void>;
  deleteVendor: (vendorId: string) => Promise<void>;
  addEvent: (evt: Omit<MandalEvent, 'id' | 'user_id'>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  addDocument: (
    docItem: Omit<MandalDocument, 'id' | 'user_id' | 'createdAt' | 'uploadedBy'>
  ) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  computedTotals: {
    collected: number;
    spent: number;
    balance: number;
    collectorCashTotal: number;
    pendingExpenseCount: number;
    pendingHandoverCount: number;
    failedWhatsAppCount: number;
    lowCreditsWarning: boolean;
    budgetAlerts: BudgetAlertItem[];
    totalAlertsCount: number;
  };
}

const MandalContext = createContext<MandalContextValue | null>(null);

export function MandalProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeMandalId, setActiveMandalId] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const [liveMandal, setLiveMandal] = useState<Mandal | null>(null);
  const [liveMembers, setLiveMembers] = useState<MandalMember[]>([]);
  const [liveUtsavs, setLiveUtsavs] = useState<Utsav[]>([]);
  const [liveEntries, setLiveEntries] = useState<LedgerEntry[]>([]);
  const [liveNakasha, setLiveNakasha] = useState<NakashaUnit[]>([]);
  const [liveVendors, setLiveVendors] = useState<Vendor[]>([]);
  const [liveEvents, setLiveEvents] = useState<MandalEvent[]>([]);
  const [liveDocuments, setLiveDocuments] = useState<MandalDocument[]>([]);
  const [liveHandovers, setLiveHandovers] = useState<CashHandover[]>([]);
  const [liveWalletTx, setLiveWalletTx] = useState<WalletTransaction[]>([]);
  const [liveCreditTx, setLiveCreditTx] = useState<CreditTransaction[]>([]);
  const [liveAuditLogs, setLiveAuditLogs] = useState<AuditLog[]>([]);

  const [mandalFetched, setMandalFetched] = useState(false);
  const [utsavsFetched, setUtsavsFetched] = useState(false);
  const [entriesFetched, setEntriesFetched] = useState(false);

  const [selectedUtsavId, setSelectedUtsavId] = useState<string>('');
  const [simulatedRole, setSimulatedRole] = useState<MemberRole | null>(null);
  const [privacyMasked, setPrivacyMasked] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'mr' || saved === 'hi' || saved === 'en') return saved;
    } catch {
      // Ignore storage errors
    }
    return 'en';
  });

  const syncedSnapshotKeyRef = useRef<string | null>(null);
  const incomeSubmitLockRef = useRef(false);
  const waDispatchLocksRef = useRef<Set<string>>(new Set());
  const packPurchaseLockRef = useRef(false);

  const resetAllLocalData = useCallback(() => {
    syncedSnapshotKeyRef.current = null;
    incomeSubmitLockRef.current = false;
    waDispatchLocksRef.current.clear();
    packPurchaseLockRef.current = false;
    setActiveMandalId(null);
    setNeedsOnboarding(false);
    setLoadError(null);
    setLiveMandal(null);
    setLiveMembers([]);
    setLiveUtsavs([]);
    setLiveEntries([]);
    setLiveNakasha([]);
    setLiveVendors([]);
    setLiveEvents([]);
    setLiveDocuments([]);
    setLiveHandovers([]);
    setLiveWalletTx([]);
    setLiveCreditTx([]);
    setLiveAuditLogs([]);
    setMandalFetched(false);
    setUtsavsFetched(false);
    setEntriesFetched(false);
    setSelectedUtsavId('');
    setSimulatedRole(null);
    setPrivacyMasked(false);
    setToast(null);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const tr = useCallback((key: string) => t(language, key), [language]);

  const showToast = useCallback(
    (message: string, tone: ToastState['tone'] = 'success', undoEntryId?: string) => {
      const id = `toast_${Date.now()}`;
      setToast({ id, message, tone, undoEntryId });
      window.setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, undoEntryId ? 8000 : 4000);
    },
    []
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const resolveUserMandal = useCallback(async (firebaseUser: User, isMounted?: () => boolean) => {
    setLoadError(null);
    setDataLoading(true);

    const applySnapshot = (linkSnap: DocumentSnapshot<DocumentData>) => {
      if (isMounted && !isMounted()) return;
      if (linkSnap.exists() && linkSnap.data().user_id === firebaseUser.uid) {
        setActiveMandalId(String(linkSnap.data().mandalId));
        setNeedsOnboarding(false);
      } else {
        setActiveMandalId(null);
        setNeedsOnboarding(true);
        setDataLoading(false);
      }
    };

    try {
      await enableNetwork(db).catch(() => {});
      const linkSnap = await getDocFromServer(doc(db, 'userMandals', firebaseUser.uid));
      applySnapshot(linkSnap);
      return;
    } catch (serverErr) {
      const code = (serverErr as { code?: string })?.code || '';
      if (code === 'permission-denied') {
        if (isMounted && !isMounted()) return;
        setActiveMandalId(null);
        setNeedsOnboarding(true);
        setDataLoading(false);
        return;
      }

      // Check local persistent cache immediately if server was temporarily unreachable
      try {
        const cachedSnap = await getDoc(doc(db, 'userMandals', firebaseUser.uid));
        if (cachedSnap.exists() && cachedSnap.data().user_id === firebaseUser.uid) {
          applySnapshot(cachedSnap);
          return;
        }
      } catch {
        // Ignore cache miss and proceed to retry
      }

      // Retry live server fetch once after short delay in case transport was still initializing
      try {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
        if (isMounted && !isMounted()) return;
        await enableNetwork(db).catch(() => {});
        const retrySnap = await getDocFromServer(doc(db, 'userMandals', firebaseUser.uid));
        applySnapshot(retrySnap);
        return;
      } catch (err) {
        if (isMounted && !isMounted()) return;
        const fallbackCode = (err as { code?: string })?.code || '';
        if (fallbackCode === 'permission-denied') {
          setActiveMandalId(null);
          setNeedsOnboarding(true);
          setDataLoading(false);
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        console.error('Failed to resolve userMandal:', message);
        setLoadError(
          message.toLowerCase().includes('offline')
            ? 'Unable to reach Cloud Firestore. Please check your internet connection and tap Retry.'
            : message || 'Could not load your Mandal ledger.'
        );
        setDataLoading(false);
      }
    }
  }, []);

  const retryLoad = useCallback(async () => {
    if (!user) return;
    await resolveUserMandal(user);
  }, [user, resolveUserMandal]);

  useEffect(() => {
    if (!loadError || !user) return;
    const handleOnline = () => {
      void resolveUserMandal(user);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadError, user, resolveUserMandal]);

  // Auth listener — strictly clears previous user state & waits for live server check
  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      resetAllLocalData();
      queryClient.clear();

      if (!firebaseUser) {
        if (!mounted) return;
        setUser(null);
        setDataLoading(false);
        setAuthReady(true);
        return;
      }

      if (!mounted) return;
      setUser(firebaseUser);
      setDataLoading(true);
      setAuthReady(true);

      await resolveUserMandal(firebaseUser, () => mounted);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [resetAllLocalData, resolveUserMandal]);

  // Live Firestore subscriptions scoped to activeMandalId (shared cleanly across invited members)
  useEffect(() => {
    if (!user || !activeMandalId) return;

    const mandalOwnerUid = activeMandalId;
    const mandalPath = `mandals/${activeMandalId}`;
    setMandalFetched(false);
    setUtsavsFetched(false);
    setEntriesFetched(false);

    const unsubMandal = onSnapshot(
      doc(db, 'mandals', activeMandalId),
      (snap) => {
        if (snap.exists() && snap.data().user_id === snap.id) {
          const d = snap.data();
          const credits = Math.max(0, Math.floor(Number(d.whatsapp_credits ?? d.whatsappCredits ?? 0)));
          setLiveMandal({
            id: snap.id,
            user_id: d.user_id,
            name: d.name,
            localName: d.localName,
            subtitle: d.subtitle,
            address: d.address,
            estYear: d.estYear,
            logoUrl: resolveMandalLogoUrl(d.logoUrl),
            signatureUrl: d.signatureUrl,
            upiId: d.upiId,
            upiQrUrl: d.upiQrUrl,
            receiptPrefix: d.receiptPrefix,
            joinCode: d.joinCode,
            tierName: d.tierName,
            whatsappCredits: credits,
            whatsapp_credits: credits,
            isVerified: Boolean(d.isVerified),
            showDonorsPublic: Boolean(d.showDonorsPublic),
            ownerId: d.ownerId,
            createdAt: toIso(d.createdAt),
            updatedAt: toIso(d.updatedAt),
          });
        } else {
          setLiveMandal(null);
          setActiveMandalId(null);
          setNeedsOnboarding(true);
          setDataLoading(false);
        }
        setMandalFetched(true);
      },
      (err) => {
        setMandalFetched(true);
        const code = (err as { code?: string })?.code || '';
        console.error(`Snapshot error at ${mandalPath}:`, err);
        if (code === 'permission-denied') {
          setLiveMandal(null);
          setActiveMandalId(null);
          setNeedsOnboarding(true);
          setDataLoading(false);
          return;
        }
        setLoadError(err.message || 'Could not load Mandal profile.');
        setDataLoading(false);
      }
    );

    const unsubMembers = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'members'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        setLiveMembers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              uid: data.uid || d.id,
              user_id: data.user_id,
              name: data.name,
              phone: data.phone,
              email: data.email,
              role: data.role as MemberRole,
              cashInHand: Number(data.cashInHand ?? 0),
              status: data.status || 'active',
              joinedAt: toIso(data.joinedAt),
            };
          })
        );
      },
      (err) => {
        console.error(`Snapshot error at ${mandalPath}/members:`, err);
      }
    );

    const unsubUtsavs = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'utsavs'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              user_id: data.user_id,
              name: data.name,
              yearCycle: data.yearCycle,
              lastReceiptSeq: Number(data.lastReceiptSeq ?? 0),
              totalCollected: Number(data.totalCollected ?? 0),
              totalSpent: Number(data.totalSpent ?? 0),
              categoryBudgets: (data.categoryBudgets as Record<string, number> | undefined) || undefined,
              isActive: Boolean(data.isActive),
              createdAt: toIso(data.createdAt),
            } as Utsav;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setLiveUtsavs(list);
        setUtsavsFetched(true);
      },
      (err) => {
        setUtsavsFetched(true);
        console.error(`Snapshot error at ${mandalPath}/utsavs:`, err);
      }
    );

    const unsubNakasha = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'nakasha'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        setLiveNakasha(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<NakashaUnit, 'id'>),
          }))
        );
      },
      (err) => console.error(`Snapshot error at ${mandalPath}/nakasha:`, err)
    );

    const unsubVendors = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'vendors'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              user_id: data.user_id,
              utsavId: data.utsavId,
              name: data.name,
              category: data.category,
              phone: data.phone,
              totalContract: Number(data.totalContract ?? 0),
              advancePaid: Number(data.advancePaid ?? 0),
              dueDate: data.dueDate,
              note: data.note,
              status: data.status || 'pending',
              createdAt: toIso(data.createdAt),
              updatedAt: toIso(data.updatedAt),
            } as Vendor;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setLiveVendors(list);
      },
      (err) => console.error(`Snapshot error at ${mandalPath}/vendors:`, err)
    );

    const unsubEvents = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'events'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<MandalEvent, 'id'>),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setLiveEvents(list);
      },
      (err) => console.error(`Snapshot error at ${mandalPath}/events:`, err)
    );

    const unsubDocs = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'documents'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              user_id: data.user_id,
              title: data.title,
              category: data.category,
              fileUrl: data.fileUrl,
              uploadedBy: data.uploadedBy,
              createdAt: toIso(data.createdAt),
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setLiveDocuments(list);
      },
      (err) => console.error(`Snapshot error at ${mandalPath}/documents:`, err)
    );

    const unsubHandovers = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'handovers'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              user_id: data.user_id,
              utsavId: data.utsavId,
              collectorUid: data.collectorUid,
              collectorName: data.collectorName,
              amount: Number(data.amount ?? 0),
              status: data.status,
              createdAt: toIso(data.createdAt),
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setLiveHandovers(list);
      },
      (err) => console.error(`Snapshot error at ${mandalPath}/handovers:`, err)
    );

    const unsubWallet = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'wallet_transactions'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              user_id: data.user_id,
              type: data.type,
              creditsDelta: Number(data.creditsDelta ?? 0),
              amountInr: Number(data.amountInr ?? 0),
              packName: data.packName,
              razorpayPaymentId: data.razorpayPaymentId,
              createdAt: toIso(data.createdAt),
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setLiveWalletTx(list);
      },
      (err) => console.error(`Snapshot error at ${mandalPath}/wallet_transactions:`, err)
    );

    const unsubCreditTx = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'credit_transactions'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: data.id || d.id,
              user_id: data.user_id,
              pack_name: String(data.pack_name || ''),
              credits_added: Number(data.credits_added ?? 0),
              amount_paid: Number(data.amount_paid ?? 0),
              payment_ref: String(data.payment_ref || ''),
              status: (data.status || 'completed') as CreditTransaction['status'],
              created_at: toIso(data.created_at),
            } as CreditTransaction;
          })
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setLiveCreditTx(list);
      },
      (err) => console.error(`Snapshot error at ${mandalPath}/credit_transactions:`, err)
    );

    const unsubAudit = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'audit_logs'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              user_id: data.user_id,
              action: data.action,
              entryId: data.entryId,
              summary: data.summary,
              beforeData: data.beforeData,
              afterData: data.afterData,
              performedByUid: data.performedByUid,
              performedByName: data.performedByName,
              timestamp: toIso(data.timestamp),
            };
          })
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setLiveAuditLogs(list);
      },
      (err) => console.error(`Snapshot error at ${mandalPath}/audit_logs:`, err)
    );

    return () => {
      unsubMandal();
      unsubMembers();
      unsubUtsavs();
      unsubNakasha();
      unsubVendors();
      unsubEvents();
      unsubDocs();
      unsubHandovers();
      unsubWallet();
      unsubCreditTx();
      unsubAudit();
    };
  }, [user, activeMandalId]);

  const activeUtsav = useMemo(() => {
    if (liveUtsavs.length === 0) return null;
    return (
      liveUtsavs.find((u) => u.id === selectedUtsavId) ||
      liveUtsavs.find((u) => u.isActive) ||
      liveUtsavs[0]
    );
  }, [liveUtsavs, selectedUtsavId]);

  // Subscribe to entries of active utsav scoped to activeMandalId
  useEffect(() => {
    if (!user || !activeMandalId || !activeUtsav) {
      setLiveEntries([]);
      return;
    }

    setEntriesFetched(false);
    const mandalOwnerUid = activeMandalId;
    const entriesPath = `mandals/${activeMandalId}/utsavs/${activeUtsav.id}/entries`;
    const unsubEntries = onSnapshot(
      query(
        collection(db, 'mandals', activeMandalId, 'utsavs', activeUtsav.id, 'entries'),
        where('user_id', '==', mandalOwnerUid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              user_id: data.user_id,
              utsavId: activeUtsav.id,
              type: data.type as EntryType,
              receiptNumber: data.receiptNumber,
              publicReceiptId: data.publicReceiptId,
              titleOrDonorName: data.titleOrDonorName,
              flatOrAddress: data.flatOrAddress,
              donorPhone: data.donorPhone,
              head: data.head,
              amount: Number(data.amount ?? 0),
              goodsDescription: data.goodsDescription,
              quantity: data.quantity,
              estimatedValue:
                data.estimatedValue !== undefined ? Number(data.estimatedValue) : undefined,
              paymentMode: data.paymentMode as PaymentMode,
              upiTransactionId: data.upiTransactionId,
              isAnonymous: Boolean(data.isAnonymous),
              billPhotoUrl: data.billPhotoUrl,
              receiptImageUrl: data.receiptImageUrl,
              note: data.note,
              whatsappStatus: data.whatsappStatus || 'not_sent',
              whatsappMessageId: data.whatsappMessageId,
              whatsappError: data.whatsappError,
              approvalStatus: data.approvalStatus || 'approved',
              createdByUid: data.createdByUid,
              createdByName: data.createdByName,
              isVoided: Boolean(data.isVoided),
              voidedAt: data.voidedAt,
              entryDate: data.entryDate,
              createdAt: toIso(data.createdAt),
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setLiveEntries(list);
        setEntriesFetched(true);
      },
      (err) => {
        setEntriesFetched(true);
        console.error(`Snapshot error at ${entriesPath}:`, err);
      }
    );

    return () => unsubEntries();
  }, [user, activeMandalId, activeUtsav?.id]);

  // Complete loading gate: never clear dataLoading until mandal + utsavs + entries finish fetching
  useEffect(() => {
    if (!user || !activeMandalId) return;
    if (mandalFetched && utsavsFetched && (!activeUtsav || entriesFetched)) {
      setDataLoading(false);
    }
  }, [user, activeMandalId, mandalFetched, utsavsFetched, activeUtsav, entriesFetched]);

  const utsavEntries = useMemo(() => {
    if (!activeUtsav) return [];
    return liveEntries
      .filter((e) => e.utsavId === activeUtsav.id)
      .sort((a, b) => {
        const dCmp = b.entryDate.localeCompare(a.entryDate);
        if (dCmp !== 0) return dCmp;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [liveEntries, activeUtsav]);

  const utsavVendors = useMemo(() => {
    if (!activeUtsav) return [];
    return liveVendors.filter((v) => v.utsavId === activeUtsav.id);
  }, [liveVendors, activeUtsav]);

  const currentMember = useMemo(() => {
    if (!user) return null;
    return liveMembers.find((m) => m.uid === user.uid) || null;
  }, [liveMembers, user]);

  const effectiveRole: MemberRole =
    simulatedRole || currentMember?.role || (liveMandal?.ownerId === user?.uid ? 'admin' : 'collector');

  // Computed totals & alerts
  const computedTotals = useMemo(() => {
    const active = utsavEntries.filter((e) => !e.isVoided && e.approvalStatus === 'approved');
    const collected = active
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    const spent = active
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
    const collectorCashTotal = liveMembers.reduce((sum, m) => sum + (m.cashInHand || 0), 0);
    const pendingExpenseCount = utsavEntries.filter(
      (e) => !e.isVoided && e.type === 'expense' && e.approvalStatus === 'pending'
    ).length;
    const pendingHandoverCount = liveHandovers.filter((h) => h.status === 'pending').length;
    const failedWhatsAppCount = utsavEntries.filter(
      (e) => !e.isVoided && e.type === 'income' && e.whatsappStatus === 'failed'
    ).length;
    const lowCreditsWarning = getAvailableWhatsAppCredits(liveMandal) <= 10;

    // Smart Category Budget Alerts (>= 80% amber warning, > 100% red exceeded)
    const expByHead = new Map<string, number>();
    for (const e of active) {
      if (e.type === 'expense') {
        expByHead.set(e.head, (expByHead.get(e.head) || 0) + e.amount);
      }
    }
    const budgetAlerts: BudgetAlertItem[] = [];
    for (const [head, limit] of Object.entries(activeUtsav?.categoryBudgets || {})) {
      if (limit > 0) {
        const spentHead = expByHead.get(head) || 0;
        const ratio = spentHead / limit;
        if (ratio >= 0.8) {
          budgetAlerts.push({
            head,
            limit,
            spent: spentHead,
            pct: Math.round(ratio * 100),
            level: ratio > 1 ? 'exceeded' : 'warning',
          });
        }
      }
    }
    budgetAlerts.sort((a, b) => b.pct - a.pct);

    const totalAlertsCount =
      pendingExpenseCount +
      pendingHandoverCount +
      failedWhatsAppCount +
      (lowCreditsWarning ? 1 : 0) +
      budgetAlerts.length;

    return {
      collected,
      spent,
      balance: collected - spent,
      collectorCashTotal,
      pendingExpenseCount,
      pendingHandoverCount,
      failedWhatsAppCount,
      lowCreditsWarning,
      budgetAlerts,
      totalAlertsCount,
    };
  }, [
    utsavEntries,
    liveMembers,
    liveHandovers,
    liveMandal?.whatsappCredits,
    liveMandal?.whatsapp_credits,
    activeUtsav?.categoryBudgets,
  ]);

  // Sync public transparency snapshot helper (masks Gupt Daan & includes Vastu Daan goods)
  const syncPublicSnapshot = useCallback(
    async (mandalObj: Mandal, utsavObj: Utsav, nextEntries: LedgerEntry[]) => {
      if (!user) return;
      const active = nextEntries.filter(
        (e) => e.utsavId === utsavObj.id && !e.isVoided && e.approvalStatus === 'approved'
      );
      const collected = active
        .filter((e) => e.type === 'income')
        .reduce((s, e) => s + e.amount, 0);
      const spent = active
        .filter((e) => e.type === 'expense')
        .reduce((s, e) => s + e.amount, 0);

      const catMap = new Map<string, number>();
      for (const e of active.filter((x) => x.type === 'expense')) {
        catMap.set(e.head, (catMap.get(e.head) || 0) + e.amount);
      }
      const categoryBreakdown = Array.from(catMap.entries())
        .map(([head, total]) => ({ head, total }))
        .sort((a, b) => b.total - a.total);

      const publicDonors = mandalObj.showDonorsPublic
        ? active
            .filter((x) => x.type === 'income')
            .slice(0, 60)
            .map((d) =>
              cleanUndefined({
                donorName: d.isAnonymous ? 'Gupt Daan / Anonymous' : d.titleOrDonorName,
                flatOrAddress: d.isAnonymous ? undefined : d.flatOrAddress,
                amount: d.amount,
                entryDate: d.entryDate,
                receiptNumber: d.receiptNumber,
              })
            )
        : [];

      const publicGoods = active
        .filter((x) => x.type === 'goods')
        .slice(0, 60)
        .map((g) =>
          cleanUndefined({
            donorName: g.isAnonymous ? 'Gupt Daan / Anonymous' : g.titleOrDonorName,
            flatOrAddress: g.isAnonymous ? undefined : g.flatOrAddress,
            goodsDescription: g.goodsDescription,
            head: g.head,
            estimatedValue: g.estimatedValue,
            quantity: g.quantity,
            entryDate: g.entryDate,
            isAnonymous: Boolean(g.isAnonymous),
          })
        );

      try {
        await setDoc(
          doc(db, 'public_mandals', mandalObj.joinCode),
          cleanUndefined({
            user_id: mandalObj.user_id,
            joinCode: mandalObj.joinCode,
            mandalId: mandalObj.id,
            mandalName: mandalObj.name,
            address: mandalObj.address,
            estYear: mandalObj.estYear,
            isVerified: mandalObj.isVerified,
            utsavName: utsavObj.name,
            yearCycle: utsavObj.yearCycle,
            totalCollected: collected,
            totalSpent: spent,
            showDonorsPublic: mandalObj.showDonorsPublic,
            categoryBreakdown,
            publicDonors,
            publicGoods,
            updatedAt: serverTimestamp(),
          })
        );
      } catch (err) {
        console.warn('Public snapshot sync warning:', err);
      }
    },
    [user]
  );

  // Auto-heal / ensure public_mandals/{joinCode} exists for existing & newly loaded Mandals
  useEffect(() => {
    if (
      !user ||
      !liveMandal ||
      !activeUtsav ||
      !mandalFetched ||
      !utsavsFetched ||
      !entriesFetched ||
      (effectiveRole !== 'admin' && effectiveRole !== 'collector')
    ) {
      return;
    }

    const goodsCount = utsavEntries.filter((e) => !e.isVoided && e.type === 'goods').length;
    const syncKey = `${liveMandal.id}:${activeUtsav.id}:${liveMandal.joinCode}:${computedTotals.collected}:${computedTotals.spent}:${goodsCount}`;
    if (syncedSnapshotKeyRef.current === syncKey) return;
    syncedSnapshotKeyRef.current = syncKey;

    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, 'public_mandals', liveMandal.joinCode));
        if (cancelled) return;
        const data = snap.exists() ? snap.data() : null;
        if (
          !data ||
          data.utsavName !== activeUtsav.name ||
          Number(data.totalCollected ?? -1) !== computedTotals.collected ||
          Number(data.totalSpent ?? -1) !== computedTotals.spent ||
          (goodsCount > 0 && !Array.isArray(data.publicGoods))
        ) {
          await syncPublicSnapshot(liveMandal, activeUtsav, liveEntries);
        }
      } catch {
        // Non-blocking auto-sync
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    liveMandal,
    activeUtsav,
    mandalFetched,
    utsavsFetched,
    entriesFetched,
    effectiveRole,
    computedTotals.collected,
    computedTotals.spent,
    utsavEntries,
    liveEntries,
    syncPublicSnapshot,
  ]);

  // Auth actions
  const loginWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const logout = useCallback(async () => {
    resetAllLocalData();
    queryClient.clear();
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }
    setLanguageState('en');
    if (auth.currentUser) {
      await signOut(auth);
    }
  }, [resetAllLocalData]);

  // Create Mandal — strictly empty starting state, scoped with user_id
  const createMandal = useCallback(
    async (input: {
      name: string;
      localName?: string;
      address: string;
      estYear: string;
      utsavName: string;
      yearCycle: string;
      upiId?: string;
    }) => {
      if (!user) throw new Error('Must be signed in');
      const mandalId = user.uid;
      const joinCode = `MND-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const ownerName = user.displayName || user.phoneNumber || 'Mandal Admin';
      const utsavId = `utsav_${Date.now()}`;

      const batch1 = writeBatch(db);
      batch1.set(
        doc(db, 'users', user.uid),
        cleanUndefined({
          user_id: user.uid,
          name: ownerName,
          email: user.email || undefined,
          phone: user.phoneNumber || undefined,
          platformRole: 'user',
          createdAt: serverTimestamp(),
        })
      );

      const mandalPayload = cleanUndefined({
        user_id: user.uid,
        name: input.name.trim(),
        localName: input.localName?.trim() || undefined,
        subtitle: `${input.utsavName} · Society Mandal`,
        address: input.address.trim(),
        estYear: input.estYear.trim() || '2026',
        logoUrl: MANDAL_DEFAULT_EMBLEM,
        upiId: input.upiId?.trim() || undefined,
        receiptPrefix: 'MB-1',
        joinCode,
        tierName: 'Free',
        whatsappCredits: DEFAULT_TRIAL_WHATSAPP_CREDITS,
        whatsapp_credits: DEFAULT_TRIAL_WHATSAPP_CREDITS,
        isVerified: true,
        showDonorsPublic: true,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch1.set(doc(db, 'mandals', mandalId), mandalPayload);

      batch1.set(
        doc(db, 'mandals', mandalId, 'members', user.uid),
        cleanUndefined({
          user_id: user.uid,
          uid: user.uid,
          name: ownerName,
          phone: user.phoneNumber || undefined,
          email: user.email || undefined,
          role: 'admin',
          cashInHand: 0,
          status: 'active',
          joinedAt: serverTimestamp(),
        })
      );

      batch1.set(doc(db, 'userMandals', user.uid), {
        user_id: user.uid,
        uid: user.uid,
        mandalId,
        role: 'admin',
        updatedAt: serverTimestamp(),
      });

      batch1.set(doc(db, 'mandalCodes', joinCode), {
        user_id: user.uid,
        joinCode,
        mandalId,
        mandalName: input.name.trim(),
        area: input.address.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });

      try {
        await batch1.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `mandals/${mandalId}`);
      }

      const batch2 = writeBatch(db);
      batch2.set(doc(db, 'mandals', mandalId, 'utsavs', utsavId), {
        user_id: user.uid,
        name: input.utsavName,
        yearCycle: input.yearCycle,
        lastReceiptSeq: 0,
        totalCollected: 0,
        totalSpent: 0,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      batch2.set(doc(db, 'mandals', mandalId, 'wallet_transactions', `wtx_welcome_${Date.now()}`), {
        user_id: user.uid,
        type: 'signup_bonus',
        creditsDelta: DEFAULT_TRIAL_WHATSAPP_CREDITS,
        amountInr: 0,
        packName: `Free Trial Credits (${DEFAULT_TRIAL_WHATSAPP_CREDITS} Receipts)`,
        createdAt: serverTimestamp(),
      });

      batch2.set(
        doc(db, 'public_mandals', joinCode),
        cleanUndefined({
          user_id: user.uid,
          joinCode,
          mandalId,
          mandalName: input.name.trim(),
          address: input.address.trim(),
          estYear: input.estYear.trim() || '2026',
          isVerified: true,
          utsavName: input.utsavName,
          yearCycle: input.yearCycle,
          totalCollected: 0,
          totalSpent: 0,
          showDonorsPublic: true,
          categoryBreakdown: [],
          publicDonors: [],
          updatedAt: serverTimestamp(),
        })
      );

      try {
        await batch2.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `mandals/${mandalId}/utsavs/${utsavId}`);
      }

      setDataLoading(true);
      setActiveMandalId(mandalId);
      setSelectedUtsavId(utsavId);
      setNeedsOnboarding(false);
      showToast(
        `${input.name.trim()} created with ${DEFAULT_TRIAL_WHATSAPP_CREDITS} free trial WhatsApp receipts!`
      );
    },
    [user, showToast]
  );

  // Explicit user-triggered optional sample loader (never runs automatically)
  const loadSampleData = useCallback(async () => {
    if (!user || !liveMandal || !activeUtsav) return;
    if (effectiveRole !== 'admin') throw new Error('Only Admin can load sample data');

    const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
    const ownerName = currentMember?.name || user.displayName || 'Mandal Admin';
    const sample = buildOptionalSampleData({
      userId: mandalOwnerUid,
      ownerName,
      utsavId: activeUtsav.id,
      receiptPrefix: liveMandal.receiptPrefix,
    });

    const batch = writeBatch(db);
    let addedIncome = 0;
    let addedExpense = 0;

    for (const e of sample.entries) {
      const { id, utsavId: _u, createdAt: _c, ...rest } = e;
      if (e.type === 'income') addedIncome += e.amount;
      if (e.type === 'expense') addedExpense += e.amount;

      batch.set(
        doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id, 'entries', id),
        cleanUndefined({
          ...rest,
          user_id: mandalOwnerUid,
          createdByUid: user.uid,
          createdByName: ownerName,
          createdAt: serverTimestamp(),
        })
      );

      if (e.type === 'income' && e.publicReceiptId && e.receiptNumber) {
        batch.set(
          doc(db, 'public_receipts', e.publicReceiptId),
          cleanUndefined({
            user_id: mandalOwnerUid,
            publicReceiptId: e.publicReceiptId,
            mandalId: liveMandal.id,
            mandalName: liveMandal.name,
            mandalAddress: liveMandal.address,
            estYear: liveMandal.estYear,
            utsavName: activeUtsav.name,
            receiptNumber: e.receiptNumber,
            donorName: e.titleOrDonorName,
            flatOrAddress: e.flatOrAddress,
            amount: e.amount,
            paymentMode: e.paymentMode,
            date: e.entryDate,
            isVerified: liveMandal.isVerified,
            isVoided: false,
          })
        );
      }
    }

    for (const unit of sample.nakasha) {
      const { id, ...rest } = unit;
      batch.set(
        doc(db, 'mandals', liveMandal.id, 'nakasha', id),
        cleanUndefined({ ...rest, user_id: mandalOwnerUid })
      );
    }

    for (const ev of sample.events) {
      const { id, ...rest } = ev;
      batch.set(
        doc(db, 'mandals', liveMandal.id, 'events', id),
        cleanUndefined({ ...rest, user_id: mandalOwnerUid })
      );
    }

    batch.update(doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id), {
      lastReceiptSeq: activeUtsav.lastReceiptSeq + 2,
      totalCollected: activeUtsav.totalCollected + addedIncome,
      totalSpent: activeUtsav.totalSpent + addedExpense,
    });

    try {
      await batch.commit();
      await syncPublicSnapshot(liveMandal, activeUtsav, [...sample.entries, ...liveEntries]);
      showToast('Sample entries loaded into your ledger!');
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}/entries`
      );
    }
  }, [user, liveMandal, activeUtsav, effectiveRole, currentMember, liveEntries, syncPublicSnapshot, showToast]);

  const joinMandalByCode = useCallback(
    async (code: string, memberName: string, phone?: string) => {
      const normalized = code.trim().toUpperCase();
      if (!user) throw new Error('Sign in first to continue');
      if (!normalized) throw new Error('Enter a valid Mandal invite code');

      const codeSnap = await getDoc(doc(db, 'mandalCodes', normalized));
      if (!codeSnap.exists()) {
        throw new Error(
          `Invite code "${normalized}" was not found. Ask your Mandal Admin for the exact code.`
        );
      }

      const { mandalId, mandalName, ownerId } = codeSnap.data() as {
        mandalId: string;
        mandalName: string;
        ownerId?: string;
      };
      const mandalOwnerUid = ownerId || mandalId;
      const displayName =
        memberName.trim() || user.displayName || user.phoneNumber || 'Karyakarta';

      const [existingUserSnap, existingMemberSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDoc(doc(db, 'mandals', mandalId, 'members', user.uid)),
      ]);

      let role: MemberRole = mandalId === user.uid ? 'admin' : 'collector';
      if (existingMemberSnap.exists()) {
        const existingMemberData = existingMemberSnap.data();
        if (existingMemberData.status === 'suspended') {
          throw new Error(`Your access to ${mandalName} is suspended. Contact the Mandal Admin.`);
        }
        role = (existingMemberData.role as MemberRole) || role;
      }

      const batch = writeBatch(db);

      if (!existingUserSnap.exists()) {
        batch.set(
          doc(db, 'users', user.uid),
          cleanUndefined({
            user_id: user.uid,
            name: displayName,
            email: user.email || undefined,
            phone: phone?.trim() || user.phoneNumber || undefined,
            platformRole: 'user',
            createdAt: serverTimestamp(),
          })
        );
      }

      if (!existingMemberSnap.exists() && mandalId !== user.uid) {
        batch.set(
          doc(db, 'mandals', mandalId, 'members', user.uid),
          cleanUndefined({
            user_id: mandalOwnerUid,
            uid: user.uid,
            name: displayName,
            phone: phone?.trim() || user.phoneNumber || undefined,
            email: user.email || undefined,
            role: 'collector',
            cashInHand: 0,
            status: 'active',
            joinedAt: serverTimestamp(),
          })
        );
      }

      batch.set(doc(db, 'userMandals', user.uid), {
        user_id: user.uid,
        uid: user.uid,
        mandalId,
        role,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `mandals/${mandalId}/members/${user.uid}`);
      }

      syncedSnapshotKeyRef.current = null;
      setLiveMandal(null);
      setLiveMembers([]);
      setLiveUtsavs([]);
      setLiveEntries([]);
      setMandalFetched(false);
      setUtsavsFetched(false);
      setEntriesFetched(false);
      setDataLoading(true);
      setActiveMandalId(mandalId);
      setNeedsOnboarding(false);
      showToast(`Joined ${mandalName}!`);
    },
    [user, showToast]
  );

  const createUtsav = useCallback(
    async (name: string, yearCycle: string) => {
      if (!user || !liveMandal || effectiveRole !== 'admin') return;
      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const newId = `utsav_${Date.now()}`;
      const actorName = currentMember?.name || user.displayName || 'Admin';
      const batch = writeBatch(db);
      batch.set(doc(db, 'mandals', liveMandal.id, 'utsavs', newId), {
        user_id: mandalOwnerUid,
        name: name.trim(),
        yearCycle: yearCycle.trim(),
        lastReceiptSeq: 0,
        totalCollected: 0,
        totalSpent: 0,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'CREATE_UTSAV',
        entryId: newId,
        summary: `Created new event workspace "${name.trim()}" (${yearCycle.trim()})`,
        afterData: auditJson({ name: name.trim(), yearCycle: yearCycle.trim() }),
        performedByUid: user.uid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });
      try {
        await batch.commit();
        setSelectedUtsavId(newId);
        showToast(`${name} (${yearCycle}) workspace created!`);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `mandals/${liveMandal.id}/utsavs/${newId}`);
      }
    },
    [user, liveMandal, effectiveRole, currentMember, showToast]
  );

  const deleteUtsav = useCallback(
    async (utsavId: string) => {
      if (!user || !liveMandal) {
        throw new Error('Mandal session not active.');
      }
      if (effectiveRole !== 'admin') {
        throw new Error('Only Mandal Admins can delete an Utsav book.');
      }
      if (liveUtsavs.length <= 1) {
        throw new Error('Cannot delete the only remaining Utsav book.');
      }
      const targetUtsav = liveUtsavs.find((u) => u.id === utsavId);
      if (!targetUtsav) {
        throw new Error('Utsav book not found.');
      }

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const entriesRef = collection(db, 'mandals', liveMandal.id, 'utsavs', utsavId, 'entries');
      const handoversRef = collection(db, 'mandals', liveMandal.id, 'handovers');
      const vendorsRef = collection(db, 'mandals', liveMandal.id, 'vendors');
      const publicReceiptsRef = collection(db, 'public_receipts');

      let entryDocs: DocumentSnapshot<DocumentData>[] = [];
      let handoverDocs: DocumentSnapshot<DocumentData>[] = [];
      let vendorDocs: DocumentSnapshot<DocumentData>[] = [];
      let publicReceiptDocs: DocumentSnapshot<DocumentData>[] = [];

      try {
        const [eSnap, hSnap, vSnap, pSnap] = await Promise.all([
          getDocs(query(entriesRef, where('user_id', '==', mandalOwnerUid))),
          getDocs(query(handoversRef, where('user_id', '==', mandalOwnerUid))),
          getDocs(query(vendorsRef, where('user_id', '==', mandalOwnerUid))),
          getDocs(query(publicReceiptsRef, where('user_id', '==', mandalOwnerUid))),
        ]);
        entryDocs = eSnap.docs;
        handoverDocs = hSnap.docs.filter((d) => d.data()?.utsavId === utsavId);
        vendorDocs = vSnap.docs.filter((d) => d.data()?.utsavId === utsavId);
        const entryPublicIds = new Set(
          entryDocs
            .map((d) => d.data()?.publicReceiptId as string | undefined)
            .filter((id): id is string => Boolean(id))
        );
        publicReceiptDocs = pSnap.docs.filter((d) => entryPublicIds.has(d.id));
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.LIST,
          `mandals/${liveMandal.id}/utsavs/${utsavId}/entries`
        );
      }

      // Compute any un-handed-over cash collected in this Utsav per member to adjust cashInHand safely
      const cashDeltaByMember = new Map<string, number>();
      for (const d of entryDocs) {
        const data = d.data();
        if (
          data &&
          !data.isVoided &&
          data.type === 'income' &&
          data.paymentMode === 'CASH' &&
          data.approvalStatus === 'approved' &&
          typeof data.createdByUid === 'string'
        ) {
          const amt = Number(data.amount) || 0;
          cashDeltaByMember.set(
            data.createdByUid,
            (cashDeltaByMember.get(data.createdByUid) || 0) + amt
          );
        }
      }
      for (const h of handoverDocs) {
        const data = h.data();
        if (data && data.status === 'confirmed' && typeof data.collectorUid === 'string') {
          const amt = Number(data.amount) || 0;
          cashDeltaByMember.set(
            data.collectorUid,
            (cashDeltaByMember.get(data.collectorUid) || 0) - amt
          );
        }
      }

      const refsToDelete = [
        ...entryDocs.map((d) => d.ref),
        ...publicReceiptDocs.map((d) => d.ref),
        ...handoverDocs.map((d) => d.ref),
        ...vendorDocs.map((d) => d.ref),
      ];

      const CHUNK_SIZE = 400;
      const nextUtsav = liveUtsavs.find((u) => u.id !== utsavId) || null;
      const actorName = (currentMember?.name || user.displayName || 'Admin').slice(0, 100);

      try {
        for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
          const chunk = refsToDelete.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const ref of chunk) {
            batch.delete(ref);
          }
          await batch.commit();
        }

        const finalBatch = writeBatch(db);
        finalBatch.delete(doc(db, 'mandals', liveMandal.id, 'utsavs', utsavId));

        if (nextUtsav && !nextUtsav.isActive) {
          finalBatch.update(doc(db, 'mandals', liveMandal.id, 'utsavs', nextUtsav.id), {
            isActive: true,
          });
        }

        for (const m of liveMembers) {
          const subtractAmt = cashDeltaByMember.get(m.uid) || 0;
          if (subtractAmt > 0 && (m.cashInHand || 0) > 0) {
            finalBatch.update(doc(db, 'mandals', liveMandal.id, 'members', m.uid), {
              cashInHand: Math.max(0, (m.cashInHand || 0) - subtractAmt),
            });
          }
        }

        finalBatch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_del_utsav_${Date.now()}`), {
          user_id: mandalOwnerUid,
          action: 'DELETE_UTSAV',
          entryId: utsavId,
          summary: `Deleted Utsav book "${targetUtsav.name} (${targetUtsav.yearCycle})" and ${entryDocs.length} entries`.slice(
            0,
            300
          ),
          beforeData: auditJson({
            name: targetUtsav.name,
            yearCycle: targetUtsav.yearCycle,
            entries: entryDocs.length,
            collected: targetUtsav.totalCollected,
            spent: targetUtsav.totalSpent,
          }),
          performedByUid: user.uid,
          performedByName: actorName,
          timestamp: serverTimestamp(),
        });

        await finalBatch.commit();

        if (nextUtsav) {
          if (selectedUtsavId === utsavId || activeUtsav?.id === utsavId) {
            setSelectedUtsavId(nextUtsav.id);
          }
          await syncPublicSnapshot(
            liveMandal,
            { ...nextUtsav, isActive: true },
            liveEntries.filter((e) => e.utsavId !== utsavId)
          );
        }

        showToast(`Deleted "${targetUtsav.name} (${targetUtsav.yearCycle})"`);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `mandals/${liveMandal.id}/utsavs/${utsavId}`
        );
      }
    },
    [
      user,
      liveMandal,
      effectiveRole,
      liveUtsavs,
      liveMembers,
      currentMember,
      selectedUtsavId,
      activeUtsav?.id,
      syncPublicSnapshot,
      liveEntries,
      showToast,
    ]
  );

  const updateCategoryBudgets = useCallback(
    async (budgets: Record<string, number>) => {
      if (!user || !liveMandal || !activeUtsav) return;
      if (effectiveRole !== 'admin') throw new Error('Only Admin can configure category budgets');

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const cleaned: Record<string, number> = {};
      for (const [k, v] of Object.entries(budgets)) {
        const num = Math.round(Number(v) || 0);
        if (k.trim() && num > 0) {
          cleaned[k.trim()] = num;
        }
      }
      const actorName = currentMember?.name || user.displayName || 'Admin';
      const batch = writeBatch(db);
      batch.update(doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id), {
        categoryBudgets: cleaned,
      });
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'UPDATE_BUDGETS',
        entryId: activeUtsav.id,
        summary: `Updated category expense budgets (${Object.keys(cleaned).length} heads configured)`,
        beforeData: auditJson(activeUtsav.categoryBudgets || {}),
        afterData: auditJson(cleaned),
        performedByUid: user.uid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });
      try {
        await batch.commit();
        showToast('Category budget limits saved');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}`
        );
      }
    },
    [user, liveMandal, activeUtsav, effectiveRole, currentMember, showToast]
  );

  const updateMandalSettings = useCallback(
    async (patch: Partial<Mandal>) => {
      if (!user || !liveMandal || effectiveRole !== 'admin') return;
      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const updated: Mandal = { ...liveMandal, ...patch, updatedAt: new Date().toISOString() };
      const firestorePatch: Record<string, unknown> = cleanUndefined({
        name: updated.name,
        localName: updated.localName,
        subtitle: updated.subtitle,
        address: updated.address,
        estYear: updated.estYear,
        logoUrl: updated.logoUrl,
        signatureUrl: updated.signatureUrl,
        upiId: updated.upiId,
        upiQrUrl: updated.upiQrUrl,
        receiptPrefix: updated.receiptPrefix,
        showDonorsPublic: updated.showDonorsPublic,
        updatedAt: serverTimestamp(),
      });
      if (patch.upiQrUrl === '') firestorePatch.upiQrUrl = deleteField();
      if (patch.upiId === '') firestorePatch.upiId = deleteField();

      const actorName = currentMember?.name || user.displayName || 'Admin';
      const batch = writeBatch(db);
      batch.update(doc(db, 'mandals', liveMandal.id), firestorePatch);
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'UPDATE_SETTINGS',
        entryId: liveMandal.id,
        summary: `Updated Mandal settings (${Object.keys(patch).join(', ')})`.slice(0, 300),
        beforeData: auditJson({
          name: liveMandal.name,
          upiId: liveMandal.upiId,
          hasUpiQr: Boolean(liveMandal.upiQrUrl),
          showDonorsPublic: liveMandal.showDonorsPublic,
        }),
        afterData: auditJson({
          name: updated.name,
          upiId: updated.upiId,
          hasUpiQr: Boolean(updated.upiQrUrl),
          showDonorsPublic: updated.showDonorsPublic,
        }),
        performedByUid: user.uid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });
      try {
        await batch.commit();
        if (activeUtsav) {
          await syncPublicSnapshot(updated, activeUtsav, liveEntries);
        }
        showToast('Mandal profile saved');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `mandals/${liveMandal.id}`);
      }
    },
    [user, liveMandal, effectiveRole, activeUtsav, liveEntries, currentMember, syncPublicSnapshot, showToast]
  );

  const findDuplicateIncome = useCallback(
    (donorName: string, amount: number, entryDate: string) => {
      const target = donorName.trim().toLowerCase();
      return utsavEntries.find(
        (e) =>
          !e.isVoided &&
          e.type === 'income' &&
          e.titleOrDonorName.trim().toLowerCase() === target &&
          e.amount === amount &&
          e.entryDate === entryDate
      );
    },
    [utsavEntries]
  );

  const addIncomeEntry = useCallback(
    async (input: AddIncomeInput): Promise<LedgerEntry> => {
      if (!user || !liveMandal || !activeUtsav) throw new Error('Mandal or Utsav not active');
      if (effectiveRole === 'auditor') throw new Error('Auditors have read-only access');
      if (incomeSubmitLockRef.current) {
        throw new Error('Receipt submission already in progress');
      }
      incomeSubmitLockRef.current = true;

      try {
        const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
        const entryId = `inc_${Date.now()}`;
        const publicReceiptId = `pub_${liveMandal.receiptPrefix.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString(36)}`;
        const creatorUid = user.uid;
        const creatorName = currentMember?.name || user.displayName || 'Treasurer';

        const normalizedPhone = normalizeWhatsAppPhone(input.donorPhone);
        const validPhone = normalizedPhone.length === 12 && normalizedPhone.startsWith('91');
        const utsavDisplayName = `${activeUtsav.name} (${activeUtsav.yearCycle})`;

        const provisionalSeq = activeUtsav.lastReceiptSeq + 1;
        const provisionalReceiptNumber = `${liveMandal.receiptPrefix}-${String(provisionalSeq).padStart(4, '0')}`;

        const initialWaStatus: LedgerEntry['whatsappStatus'] = input.autoSendWhatsApp
          ? 'sent'
          : 'not_sent';

        const baseEntry: LedgerEntry = {
          id: entryId,
          user_id: mandalOwnerUid,
          utsavId: activeUtsav.id,
          type: 'income',
          receiptNumber: provisionalReceiptNumber,
          publicReceiptId,
          titleOrDonorName: input.donorName.trim(),
          flatOrAddress: input.flatOrAddress?.trim() || undefined,
          donorPhone: validPhone ? normalizedPhone : input.donorPhone?.trim() || undefined,
          head: input.head,
          amount: Number(input.amount),
          paymentMode: input.paymentMode,
          upiTransactionId: input.upiTransactionId?.trim() || undefined,
          isAnonymous: Boolean(input.isAnonymous),
          note: input.note?.trim() || undefined,
          whatsappStatus: initialWaStatus,
          approvalStatus: 'approved',
          createdByUid: creatorUid,
          createdByName: creatorName,
          isVoided: false,
          entryDate: input.entryDate,
          createdAt: new Date().toISOString(),
        };

        const utsavRef = doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id);
        const entryRef = doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id, 'entries', entryId);
        const publicReceiptRef = doc(db, 'public_receipts', publicReceiptId);
        const memberRef =
          baseEntry.paymentMode === 'CASH' && currentMember
            ? doc(db, 'mandals', liveMandal.id, 'members', creatorUid)
            : null;

        let committedEntry: LedgerEntry = {
          ...baseEntry,
          whatsappStatus: initialWaStatus,
        };

        try {
          await runTransaction(db, async (tx) => {
            const [utsavSnap, memberSnap] = await Promise.all([
              tx.get(utsavRef),
              memberRef ? tx.get(memberRef) : Promise.resolve(null),
            ]);

            if (!utsavSnap.exists()) {
              throw new Error('Utsav record missing');
            }

            const utsavData = utsavSnap.data();
            const liveSeq = Number(utsavData.lastReceiptSeq ?? activeUtsav.lastReceiptSeq) + 1;
            const liveTotalCollected = Number(utsavData.totalCollected ?? activeUtsav.totalCollected);
            const liveReceiptNumber = `${liveMandal.receiptPrefix}-${String(liveSeq).padStart(4, '0')}`;

            committedEntry = {
              ...baseEntry,
              receiptNumber: liveReceiptNumber,
              whatsappStatus: initialWaStatus,
            };

            const { id: _id, utsavId: _u, createdAt: _c, ...entryFields } = committedEntry;
            tx.set(
              entryRef,
              cleanUndefined({ ...entryFields, user_id: mandalOwnerUid, createdAt: serverTimestamp() })
            );

            tx.update(utsavRef, {
              lastReceiptSeq: liveSeq,
              totalCollected: liveTotalCollected + committedEntry.amount,
            });

            if (memberRef && memberSnap?.exists()) {
              const liveCash = Number(memberSnap.data().cashInHand ?? currentMember?.cashInHand ?? 0);
              tx.update(memberRef, {
                cashInHand: liveCash + committedEntry.amount,
              });
            }

            tx.set(
              publicReceiptRef,
              cleanUndefined({
                user_id: mandalOwnerUid,
                publicReceiptId,
                mandalId: liveMandal.id,
                mandalName: liveMandal.name,
                mandalAddress: liveMandal.address,
                estYear: liveMandal.estYear,
                utsavName: activeUtsav.name,
                receiptNumber: liveReceiptNumber,
                donorName: committedEntry.titleOrDonorName,
                flatOrAddress: committedEntry.flatOrAddress,
                amount: committedEntry.amount,
                paymentMode: committedEntry.paymentMode,
                upiTransactionId: committedEntry.upiTransactionId,
                isAnonymous: committedEntry.isAnonymous,
                date: committedEntry.entryDate,
                receiptImageUrl: committedEntry.receiptImageUrl,
                isVerified: liveMandal.isVerified,
                isVoided: false,
              })
            );

            tx.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
              user_id: mandalOwnerUid,
              action: 'CREATE_INCOME',
              entryId,
              summary: `Issued ${liveReceiptNumber} to ${committedEntry.isAnonymous ? 'Gupt Daan' : committedEntry.titleOrDonorName} for ₹${committedEntry.amount}`,
              afterData: auditJson({
                receiptNumber: liveReceiptNumber,
                donor: committedEntry.titleOrDonorName,
                amount: committedEntry.amount,
                mode: committedEntry.paymentMode,
                utr: committedEntry.upiTransactionId,
                isAnonymous: committedEntry.isAnonymous,
                whatsappStatus: initialWaStatus,
              }),
              performedByUid: creatorUid,
              performedByName: creatorName,
              timestamp: serverTimestamp(),
            });
          });
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}/entries/${entryId}`
          );
        }

        // Trigger Minimal PNG generation (OffscreenCanvas Web Worker) + Firebase Storage upload
        // immediately upon entry commit without blocking the UI from rendering the receipt.
        const uploadPromise = generateAndUploadReceiptPng({
          mandal: liveMandal,
          utsavName: utsavDisplayName,
          entry: committedEntry,
          receiptNoOverride: committedEntry.receiptNumber,
          uploadTimeoutMs: 4500,
        }).catch(() => null);

        // Save complete donation record to Firestore `donations` collection in parallel
        const donationDocPromise = addDoc(
          collection(db, 'donations'),
          cleanUndefined({
            user_id: mandalOwnerUid,
            mandalId: liveMandal.id,
            utsavId: activeUtsav.id,
            entryId,
            donorName: committedEntry.titleOrDonorName.slice(0, 140),
            flatNo: (committedEntry.flatOrAddress || '').slice(0, 140),
            phone: validPhone ? normalizedPhone : '',
            amount: committedEntry.amount,
            mode: committedEntry.paymentMode,
            category: (committedEntry.head || 'General').slice(0, 80),
            utsavCycle: utsavDisplayName.slice(0, 120),
            mandalName: (liveMandal.name || 'Peaceful Group').slice(0, 140),
            receiptNo: (committedEntry.receiptNumber || provisionalReceiptNumber).slice(0, 32),
            receiptImageUrl: committedEntry.receiptImageUrl || '',
            whatsappStatus: committedEntry.whatsappStatus,
            creditDeducted: false,
            createdAt: serverTimestamp(),
          })
        ).catch((donationErr) => {
          console.warn('Donation record sync warning:', donationErr);
          return undefined;
        });

        // Synchronize uploaded receiptImageUrl onto entry, public_receipts, and donations
        void Promise.all([uploadPromise, donationDocPromise])
          .then(async ([uploadRes, savedDonationRef]) => {
            if (!uploadRes?.receiptImageUrl) return;
            const patchBatch = writeBatch(db);
            patchBatch.update(entryRef, { receiptImageUrl: uploadRes.receiptImageUrl });
            patchBatch.update(publicReceiptRef, { receiptImageUrl: uploadRes.receiptImageUrl });
            if (savedDonationRef) {
              patchBatch.update(savedDonationRef, { receiptImageUrl: uploadRes.receiptImageUrl });
            }
            await patchBatch.commit();
          })
          .catch(() => {
            // Non-blocking: receipt verification URL remains immediately valid
          });

        void syncPublicSnapshot(liveMandal, activeUtsav, [committedEntry, ...liveEntries]);
        showToast(
          input.autoSendWhatsApp
            ? `Receipt ${committedEntry.receiptNumber} saved • Ready for WhatsApp`
            : `Receipt ${committedEntry.receiptNumber} saved!`
        );
        return committedEntry;
      } finally {
        incomeSubmitLockRef.current = false;
      }
    },
    [
      user,
      liveMandal,
      activeUtsav,
      effectiveRole,
      currentMember,
      liveEntries,
      syncPublicSnapshot,
      showToast,
    ]
  );

  const addExpenseEntry = useCallback(
    async (input: AddExpenseInput): Promise<LedgerEntry> => {
      if (!user || !liveMandal || !activeUtsav) throw new Error('Mandal or Utsav not active');
      if (effectiveRole === 'auditor') throw new Error('Auditors have read-only access');

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const entryId = `exp_${Date.now()}`;
      const creatorUid = user.uid;
      const creatorName = currentMember?.name || user.displayName || 'Treasurer';
      const approvalStatus: LedgerEntry['approvalStatus'] =
        effectiveRole === 'admin' ? 'approved' : 'pending';

      const newEntry: LedgerEntry = {
        id: entryId,
        user_id: mandalOwnerUid,
        utsavId: activeUtsav.id,
        type: 'expense',
        titleOrDonorName: input.title.trim(),
        flatOrAddress: input.paidOutOfPocket
          ? `Paid Out-of-Pocket by ${creatorName}`
          : input.vendorOrNote?.trim() || undefined,
        head: input.head,
        amount: Number(input.amount),
        paymentMode: input.paymentMode,
        billPhotoUrl: input.billPhotoUrl,
        note: input.vendorOrNote?.trim() || undefined,
        whatsappStatus: 'not_sent',
        approvalStatus,
        createdByUid: creatorUid,
        createdByName: creatorName,
        isVoided: false,
        entryDate: input.entryDate,
        createdAt: new Date().toISOString(),
      };

      const batch = writeBatch(db);
      const { id: _id, utsavId: _u, createdAt: _c, ...fields } = newEntry;
      batch.set(
        doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id, 'entries', entryId),
        cleanUndefined({ ...fields, user_id: mandalOwnerUid, createdAt: serverTimestamp() })
      );
      if (approvalStatus === 'approved') {
        batch.update(doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id), {
          totalSpent: activeUtsav.totalSpent + newEntry.amount,
        });
      }
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: approvalStatus === 'approved' ? 'CREATE_EXPENSE' : 'SUBMIT_EXPENSE',
        entryId,
        summary: `${creatorName} recorded expense ₹${newEntry.amount} (${newEntry.titleOrDonorName})`,
        afterData: auditJson({
          title: newEntry.titleOrDonorName,
          head: newEntry.head,
          amount: newEntry.amount,
          mode: newEntry.paymentMode,
          approvalStatus,
          hasBill: Boolean(newEntry.billPhotoUrl),
        }),
        performedByUid: creatorUid,
        performedByName: creatorName,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}/entries/${entryId}`
        );
      }

      await syncPublicSnapshot(liveMandal, activeUtsav, [newEntry, ...liveEntries]);
      showToast(
        approvalStatus === 'pending' ? 'Expense submitted for Admin approval' : 'Expense saved!'
      );
      return newEntry;
    },
    [
      user,
      liveMandal,
      activeUtsav,
      effectiveRole,
      currentMember,
      liveEntries,
      syncPublicSnapshot,
      showToast,
    ]
  );

  const addGoodsEntry = useCallback(
    async (input: AddGoodsInput): Promise<LedgerEntry> => {
      if (!user || !liveMandal || !activeUtsav) throw new Error('Mandal or Utsav not active');
      if (effectiveRole === 'auditor') throw new Error('Auditors have read-only access');

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const entryId = `gds_${Date.now()}`;
      const creatorUid = user.uid;
      const creatorName = currentMember?.name || user.displayName || 'Treasurer';
      const receiptNumber = `${liveMandal.receiptPrefix}-V${String(Date.now()).slice(-4)}`;
      const publicReceiptId = `pub_v_${Date.now().toString(36)}`;

      const newEntry: LedgerEntry = {
        id: entryId,
        user_id: mandalOwnerUid,
        utsavId: activeUtsav.id,
        type: 'goods',
        receiptNumber,
        publicReceiptId,
        titleOrDonorName: input.donorName.trim(),
        flatOrAddress: input.flatOrAddress?.trim() || undefined,
        donorPhone: input.donorPhone?.trim() || undefined,
        head: input.head,
        amount: 0,
        goodsDescription: input.goodsDescription.trim(),
        quantity: input.quantity?.trim() || undefined,
        estimatedValue:
          input.estimatedValue && Number(input.estimatedValue) > 0
            ? Number(input.estimatedValue)
            : undefined,
        isAnonymous: Boolean(input.isAnonymous),
        paymentMode: 'GOODS',
        note: input.note?.trim() || undefined,
        whatsappStatus: 'not_sent',
        approvalStatus: 'approved',
        createdByUid: creatorUid,
        createdByName: creatorName,
        isVoided: false,
        entryDate: input.entryDate,
        createdAt: new Date().toISOString(),
      };

      const { id: _id, utsavId: _u, createdAt: _c, ...fields } = newEntry;
      const batch = writeBatch(db);
      batch.set(
        doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id, 'entries', entryId),
        cleanUndefined({ ...fields, user_id: mandalOwnerUid, createdAt: serverTimestamp() })
      );
      batch.set(
        doc(db, 'public_receipts', publicReceiptId),
        cleanUndefined({
          user_id: mandalOwnerUid,
          publicReceiptId,
          mandalId: liveMandal.id,
          mandalName: liveMandal.name,
          mandalAddress: liveMandal.address,
          estYear: liveMandal.estYear,
          utsavName: activeUtsav.name,
          receiptNumber,
          donorName: newEntry.titleOrDonorName,
          flatOrAddress: newEntry.flatOrAddress,
          amount: newEntry.estimatedValue || 0,
          paymentMode: 'GOODS',
          isAnonymous: newEntry.isAnonymous,
          date: newEntry.entryDate,
          isVerified: liveMandal.isVerified,
          isVoided: false,
        })
      );
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'CREATE_GOODS',
        entryId,
        summary: `Recorded Vastu Daan from ${newEntry.titleOrDonorName}: ${newEntry.goodsDescription}`,
        afterData: auditJson({
          donor: newEntry.titleOrDonorName,
          goods: newEntry.goodsDescription,
          quantity: newEntry.quantity,
          estimatedValue: newEntry.estimatedValue,
          isAnonymous: newEntry.isAnonymous,
        }),
        performedByUid: creatorUid,
        performedByName: creatorName,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}/entries/${entryId}`
        );
      }
      await syncPublicSnapshot(liveMandal, activeUtsav, [newEntry, ...liveEntries]);
      showToast('Vastu Daan entry saved!');
      return newEntry;
    },
    [user, liveMandal, activeUtsav, effectiveRole, currentMember, liveEntries, syncPublicSnapshot, showToast]
  );

  const importEntriesBatch = useCallback(
    async (rows: ImportedLedgerRow[]): Promise<number> => {
      if (!user || !liveMandal || !activeUtsav) throw new Error('Mandal or Utsav not active');
      if (effectiveRole === 'auditor') throw new Error('Auditors have read-only access');

      const validRows = rows.filter(
        (r) => r.selected !== false && (r.type === 'goods' || (Number.isFinite(r.amount) && r.amount > 0))
      );
      if (validRows.length === 0) {
        throw new Error('No valid entries selected for import');
      }

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const creatorUid = user.uid;
      const creatorName = (currentMember?.name || user.displayName || 'Treasurer').slice(0, 100);
      const baseTs = Date.now();
      const baseTs36 = baseTs.toString(36);
      const yearShort = activeUtsav.yearCycle.slice(-2);
      const prefix = liveMandal.receiptPrefix || 'MB';

      let nextSeq = activeUtsav.lastReceiptSeq;
      let addedCollected = 0;
      let addedApprovedSpent = 0;
      let addedCashInHand = 0;
      let incomeCount = 0;

      const createdEntries: LedgerEntry[] = [];
      const publicReceiptsToWrite: Array<{
        publicReceiptId: string;
        data: Record<string, unknown>;
      }> = [];

      validRows.forEach((row, idx) => {
        const cleanTitle = (row.titleOrDonorName || 'Imported Entry').trim().slice(0, 140) || 'Imported Entry';
        const cleanHead = (row.head || (row.type === 'expense' ? 'Other Expense' : 'Vargani / Chanda'))
          .trim()
          .slice(0, 60);
        const cleanDate =
          row.entryDate && row.entryDate.length >= 8
            ? row.entryDate.slice(0, 32)
            : new Date().toISOString().slice(0, 10);
        const cleanAmount =
          row.type === 'goods' ? 0 : Math.round(Math.max(0, Number(row.amount) || 0) * 100) / 100;
        const cleanMode: PaymentMode =
          row.type === 'goods'
            ? 'GOODS'
            : row.paymentMode === 'UPI' || row.paymentMode === 'BANK' || row.paymentMode === 'CASH'
            ? row.paymentMode
            : 'CASH';
        const cleanAddress = row.flatOrAddress?.trim().slice(0, 140) || undefined;
        const cleanPhone = row.donorPhone ? normalizeIndianPhone(row.donorPhone).slice(0, 24) : undefined;
        const cleanNote = row.note?.trim().slice(0, 300) || undefined;
        const cleanGoodsDesc =
          row.type === 'goods'
            ? (row.goodsDescription || row.note || cleanTitle).trim().slice(0, 240)
            : undefined;

        const entryId = `imp_${baseTs}_${idx}`;
        let receiptNumber: string | undefined;
        let publicReceiptId: string | undefined;

        if (row.type === 'income') {
          nextSeq += 1;
          incomeCount += 1;
          addedCollected += cleanAmount;
          if (cleanMode === 'CASH') {
            addedCashInHand += cleanAmount;
          }
          receiptNumber = `${prefix}-${yearShort}-${String(nextSeq).padStart(4, '0')}`.slice(0, 32);
          publicReceiptId = `pub_imp_${baseTs36}_${idx}`.slice(0, 64);

          publicReceiptsToWrite.push({
            publicReceiptId,
            data: cleanUndefined({
              user_id: mandalOwnerUid,
              publicReceiptId,
              mandalId: liveMandal.id,
              mandalName: liveMandal.name.slice(0, 140),
              mandalAddress: liveMandal.address?.slice(0, 240),
              estYear: liveMandal.estYear?.slice(0, 10),
              utsavName: activeUtsav.name.slice(0, 80),
              receiptNumber,
              donorName: cleanTitle,
              flatOrAddress: cleanAddress,
              amount: cleanAmount,
              paymentMode: cleanMode,
              date: cleanDate,
              isVerified: liveMandal.isVerified,
              isVoided: false,
            }),
          });
        }

        const approvalStatus: LedgerEntry['approvalStatus'] =
          row.type === 'expense' && effectiveRole !== 'admin' ? 'pending' : 'approved';

        if (row.type === 'expense' && approvalStatus === 'approved') {
          addedApprovedSpent += cleanAmount;
        }

        createdEntries.push({
          id: entryId,
          user_id: mandalOwnerUid,
          utsavId: activeUtsav.id,
          type: row.type,
          receiptNumber,
          publicReceiptId,
          titleOrDonorName: cleanTitle,
          flatOrAddress: cleanAddress,
          donorPhone: cleanPhone || undefined,
          head: cleanHead,
          amount: cleanAmount,
          goodsDescription: cleanGoodsDesc,
          paymentMode: cleanMode,
          note: cleanNote,
          whatsappStatus: 'not_sent',
          approvalStatus,
          createdByUid: creatorUid,
          createdByName: creatorName,
          isVoided: false,
          entryDate: cleanDate,
          createdAt: new Date().toISOString(),
        });
      });

      const CHUNK_SIZE = 150;
      for (let start = 0; start < createdEntries.length; start += CHUNK_SIZE) {
        const chunk = createdEntries.slice(start, start + CHUNK_SIZE);
        const batch = writeBatch(db);
        const chunkPublicIds = new Set(chunk.map((e) => e.publicReceiptId).filter(Boolean));

        for (const entry of chunk) {
          const { id: _id, utsavId: _u, createdAt: _c, ...fields } = entry;
          batch.set(
            doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id, 'entries', entry.id),
            cleanUndefined({ ...fields, user_id: mandalOwnerUid, createdAt: serverTimestamp() })
          );
        }

        for (const pub of publicReceiptsToWrite) {
          if (chunkPublicIds.has(pub.publicReceiptId)) {
            batch.set(doc(db, 'public_receipts', pub.publicReceiptId), pub.data);
          }
        }

        const isLastChunk = start + CHUNK_SIZE >= createdEntries.length;
        if (isLastChunk) {
          const utsavPatch: Record<string, number> = {};
          if (incomeCount > 0 || addedCollected > 0) {
            utsavPatch.lastReceiptSeq = nextSeq;
            utsavPatch.totalCollected = activeUtsav.totalCollected + addedCollected;
          }
          if (addedApprovedSpent > 0 && effectiveRole === 'admin') {
            utsavPatch.totalSpent = activeUtsav.totalSpent + addedApprovedSpent;
          }
          if (Object.keys(utsavPatch).length > 0) {
            batch.update(
              doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id),
              utsavPatch
            );
          }

          if (addedCashInHand > 0 && currentMember) {
            batch.update(doc(db, 'mandals', liveMandal.id, 'members', creatorUid), {
              cashInHand: currentMember.cashInHand + addedCashInHand,
            });
          }

          batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_imp_${baseTs}`), {
            user_id: mandalOwnerUid,
            action: 'IMPORT_LEDGER',
            entryId: `import_${baseTs36}`,
            summary: `Imported ${createdEntries.length} ledger entries (+₹${addedCollected} / −₹${addedApprovedSpent})`.slice(
              0,
              300
            ),
            afterData: auditJson({
              count: createdEntries.length,
              incomeAdded: addedCollected,
              expenseAdded: addedApprovedSpent,
            }),
            performedByUid: creatorUid,
            performedByName: creatorName,
            timestamp: serverTimestamp(),
          });
        }

        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}/entries`
          );
        }
      }

      await syncPublicSnapshot(liveMandal, activeUtsav, [...createdEntries, ...liveEntries]);
      showToast(`Imported ${createdEntries.length} entries to ledger!`);
      return createdEntries.length;
    },
    [
      user,
      liveMandal,
      activeUtsav,
      effectiveRole,
      currentMember,
      liveEntries,
      syncPublicSnapshot,
      showToast,
    ]
  );

  const updateEntry = useCallback(
    async (entryId: string, patch: Partial<LedgerEntry>) => {
      if (!user || !liveMandal || !activeUtsav) return;
      if (effectiveRole !== 'admin') throw new Error('Only Admin can edit saved entries');
      const target = liveEntries.find((e) => e.id === entryId);
      if (!target) return;

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const updated: LedgerEntry = { ...target, ...patch };
      const actorUid = user.uid;
      const actorName = currentMember?.name || user.displayName || 'Admin';

      const batch = writeBatch(db);
      batch.update(
        doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id, 'entries', entryId),
        cleanUndefined({
          titleOrDonorName: updated.titleOrDonorName,
          flatOrAddress: updated.flatOrAddress,
          donorPhone: updated.donorPhone,
          head: updated.head,
          amount: updated.amount,
          paymentMode: updated.paymentMode,
          upiTransactionId: updated.upiTransactionId,
          note: updated.note,
          entryDate: updated.entryDate,
        })
      );
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'EDIT_ENTRY',
        entryId,
        summary: `Edited ${target.titleOrDonorName} (₹${target.amount} → ₹${updated.amount})`,
        beforeData: auditJson({
          title: target.titleOrDonorName,
          head: target.head,
          amount: target.amount,
          mode: target.paymentMode,
          date: target.entryDate,
        }),
        afterData: auditJson({
          title: updated.titleOrDonorName,
          head: updated.head,
          amount: updated.amount,
          mode: updated.paymentMode,
          date: updated.entryDate,
        }),
        performedByUid: actorUid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}/entries/${entryId}`
        );
      }
      await syncPublicSnapshot(
        liveMandal,
        activeUtsav,
        liveEntries.map((e) => (e.id === entryId ? updated : e))
      );
      showToast('Entry updated & audit logged');
    },
    [user, liveMandal, activeUtsav, effectiveRole, liveEntries, currentMember, syncPublicSnapshot, showToast]
  );

  const voidEntry = useCallback(
    async (entryId: string) => {
      if (!user || !liveMandal || !activeUtsav) return;
      if (effectiveRole !== 'admin') throw new Error('Only Admin can void entries');
      const target = liveEntries.find((e) => e.id === entryId);
      if (!target || target.isVoided) return;

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const voidedAt = new Date().toISOString();
      const actorUid = user.uid;
      const actorName = currentMember?.name || user.displayName || 'Admin';

      const batch = writeBatch(db);
      batch.update(
        doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id, 'entries', entryId),
        { isVoided: true, voidedAt }
      );
      if (target.publicReceiptId) {
        batch.update(doc(db, 'public_receipts', target.publicReceiptId), { isVoided: true });
      }
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'VOID_ENTRY',
        entryId,
        summary: `Voided ${target.type} entry "${target.titleOrDonorName}" (₹${target.amount})`,
        beforeData: auditJson({
          title: target.titleOrDonorName,
          amount: target.amount,
          isVoided: false,
        }),
        afterData: auditJson({
          title: target.titleOrDonorName,
          amount: target.amount,
          isVoided: true,
        }),
        performedByUid: actorUid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}/entries/${entryId}`
        );
      }
      await syncPublicSnapshot(
        liveMandal,
        activeUtsav,
        liveEntries.map((e) => (e.id === entryId ? { ...e, isVoided: true, voidedAt } : e))
      );
      showToast('Entry voided — tap Undo to restore', 'info', entryId);
    },
    [user, liveMandal, activeUtsav, effectiveRole, liveEntries, currentMember, syncPublicSnapshot, showToast]
  );

  const restoreEntry = useCallback(
    async (entryId: string) => {
      if (!user || !liveMandal || !activeUtsav) return;
      if (effectiveRole !== 'admin') throw new Error('Only Admin can restore voided entries');
      const target = liveEntries.find((e) => e.id === entryId);
      if (!target) return;

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const actorUid = user.uid;
      const actorName = currentMember?.name || user.displayName || 'Admin';

      const batch = writeBatch(db);
      batch.update(
        doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id, 'entries', entryId),
        { isVoided: false }
      );
      if (target.publicReceiptId) {
        batch.update(doc(db, 'public_receipts', target.publicReceiptId), { isVoided: false });
      }
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'RESTORE_ENTRY',
        entryId,
        summary: `Restored entry "${target.titleOrDonorName}"`,
        beforeData: auditJson({ isVoided: true }),
        afterData: auditJson({ isVoided: false }),
        performedByUid: actorUid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}/entries/${entryId}`
        );
      }
      await syncPublicSnapshot(
        liveMandal,
        activeUtsav,
        liveEntries.map((e) => (e.id === entryId ? { ...e, isVoided: false } : e))
      );
      showToast('Entry restored!');
    },
    [user, liveMandal, activeUtsav, effectiveRole, liveEntries, currentMember, syncPublicSnapshot, showToast]
  );

  const generateReceiptJpegUrl = useCallback(
    async (entry: LedgerEntry): Promise<ReceiptJpegUploadResult> => {
      if (!liveMandal) {
        throw new Error('No active Mandal selected.');
      }
      const entryUtsav = liveUtsavs.find((u) => u.id === entry.utsavId) || activeUtsav;
      const utsavDisplayName = entryUtsav
        ? `${entryUtsav.name} (${entryUtsav.yearCycle})`
        : 'Ganeshotsav';

      const uploadResult = await generateAndUploadReceiptPng({
        mandal: liveMandal,
        utsavName: utsavDisplayName,
        entry,
        receiptNoOverride: entry.receiptNumber,
      });

      if (uploadResult.receiptImageUrl && entry.utsavId) {
        try {
          const batch = writeBatch(db);
          batch.update(
            doc(db, 'mandals', liveMandal.id, 'utsavs', entry.utsavId, 'entries', entry.id),
            { receiptImageUrl: uploadResult.receiptImageUrl }
          );
          if (entry.publicReceiptId) {
            batch.update(doc(db, 'public_receipts', entry.publicReceiptId), {
              receiptImageUrl: uploadResult.receiptImageUrl,
            });
          }
          await batch.commit();
        } catch (err) {
          handleFirestoreError(
            err,
            OperationType.UPDATE,
            `mandals/${liveMandal.id}/utsavs/${entry.utsavId}/entries/${entry.id}`
          );
        }
      }

      return uploadResult;
    },
    [liveMandal, liveUtsavs, activeUtsav]
  );

  const resendWhatsAppReceipt = useCallback(
    async (
      entryId: string,
      updatedPhone?: string,
      preUploadedImageUrl?: string
    ): Promise<boolean> => {
      if (!user || !liveMandal || !activeUtsav) return false;
      if (effectiveRole === 'auditor') {
        showToast('Auditors have read-only access', 'error');
        return false;
      }
      if (waDispatchLocksRef.current.has(entryId)) {
        return false;
      }
      waDispatchLocksRef.current.add(entryId);

      try {
        const target = liveEntries.find((e) => e.id === entryId);
        if (!target) return false;

        const hasExplicitPhone = updatedPhone !== undefined && updatedPhone.trim().length > 0;
        const normalizedExplicit = hasExplicitPhone ? normalizeWhatsAppPhone(updatedPhone) : '';
        if (hasExplicitPhone && normalizedExplicit.length !== 12) {
          showToast('Please enter a valid 10-digit WhatsApp mobile number', 'error');
          return false;
        }
        const normalizedExisting = normalizeWhatsAppPhone(target.donorPhone);
        const effectivePhone = normalizedExplicit || normalizedExisting;

        const entryUtsav = liveUtsavs.find((u) => u.id === target.utsavId) || activeUtsav;
        const utsavDisplayName = `${entryUtsav.name} (${entryUtsav.yearCycle})`;
        const receiptNo =
          target.receiptNumber || `${liveMandal.receiptPrefix}-${target.id.slice(-4)}`;

        const shareRes = await shareReceiptWithImageOnWhatsApp({
          mandal: liveMandal,
          utsavName: utsavDisplayName,
          entry: target,
          language,
          phoneOverride: effectivePhone || undefined,
          receiptImageUrlOverride: preUploadedImageUrl || target.receiptImageUrl,
        });

        let receiptImageUrl = preUploadedImageUrl || target.receiptImageUrl;
        if (!receiptImageUrl) {
          try {
            const uploadResult = await generateAndUploadReceiptPng({
              mandal: liveMandal,
              utsavName: utsavDisplayName,
              entry: target,
              receiptNoOverride: receiptNo,
            });
            if (uploadResult.receiptImageUrl) {
              receiptImageUrl = uploadResult.receiptImageUrl;
            }
          } catch {
            // Non-blocking fallback
          }
        }

        const entryRef = doc(
          db,
          'mandals',
          liveMandal.id,
          'utsavs',
          target.utsavId || activeUtsav.id,
          'entries',
          entryId
        );
        const patch: Record<string, unknown> = {
          whatsappStatus: 'sent',
          whatsappError: deleteField(),
        };
        if (effectivePhone) {
          patch.donorPhone = effectivePhone;
        }
        if (receiptImageUrl) {
          patch.receiptImageUrl = receiptImageUrl;
        }

        try {
          const batch = writeBatch(db);
          batch.update(entryRef, patch);
          if (receiptImageUrl && target.publicReceiptId) {
            batch.update(doc(db, 'public_receipts', target.publicReceiptId), {
              receiptImageUrl,
            });
          }
          await batch.commit();
        } catch (err) {
          console.warn('Could not update WhatsApp share status:', err);
        }

        if (shareRes.status === 'downloaded_and_opened_wa') {
          showToast('Receipt PNG saved & message copied! Attach the image in WhatsApp.', 'info');
        } else if (shareRes.status === 'shared_with_image') {
          showToast('Receipt image & Thank You message shared on WhatsApp');
        }
        return true;
      } finally {
        waDispatchLocksRef.current.delete(entryId);
      }
    },
    [user, liveMandal, activeUtsav, liveUtsavs, effectiveRole, liveEntries, language, showToast]
  );

  const sendAutomatedWhatsAppReceipt = useCallback(
    async (entry: LedgerEntry, updatedPhone?: string, languageOverride?: Language) => {
      if (!liveMandal) {
        throw new Error('No active Mandal selected.');
      }
      const entryUtsav = liveUtsavs.find((u) => u.id === entry.utsavId) || activeUtsav;
      const utsavDisplayName = entryUtsav
        ? `${entryUtsav.name} (${entryUtsav.yearCycle})`
        : 'Ganeshotsav';

      let receiptImageUrl = entry.receiptImageUrl;
      if (!receiptImageUrl) {
        const uploadResult = await generateReceiptJpegUrl(entry);
        receiptImageUrl = uploadResult.receiptImageUrl;
      }

      const normalizedPhone = normalizeWhatsAppPhone(updatedPhone ?? entry.donorPhone);
      if (effectiveRole !== 'auditor' && entry.utsavId) {
        try {
          const patch: Record<string, unknown> = {
            whatsappStatus: 'sent',
            whatsappError: deleteField(),
          };
          if (normalizedPhone) {
            patch.donorPhone = normalizedPhone;
          }
          if (receiptImageUrl) {
            patch.receiptImageUrl = receiptImageUrl;
          }
          await updateDoc(
            doc(db, 'mandals', liveMandal.id, 'utsavs', entry.utsavId, 'entries', entry.id),
            patch
          );
        } catch {
          // Non-blocking status sync
        }
      }

      const dispatch = buildAutomatedWhatsAppDispatchPayload({
        mandal: liveMandal,
        utsavName: utsavDisplayName,
        entry,
        receiptImageUrl,
        phoneOverride: normalizedPhone || updatedPhone,
        language: languageOverride || language,
      });

      return {
        ok: true,
        receiptImageUrl: dispatch.receiptImageUrl,
        whatsappMessage: dispatch.whatsappMessage,
        whatsappUrl: dispatch.whatsappUrl,
      };
    },
    [liveMandal, liveUtsavs, activeUtsav, effectiveRole, language, generateReceiptJpegUrl]
  );

  const approvePendingExpense = useCallback(
    async (entryId: string) => {
      if (!user || !liveMandal || !activeUtsav || effectiveRole !== 'admin') return;
      const target = liveEntries.find((e) => e.id === entryId);
      if (!target) return;

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const actorUid = user.uid;
      const actorName = currentMember?.name || user.displayName || 'Admin';

      const batch = writeBatch(db);
      batch.update(
        doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id, 'entries', entryId),
        { approvalStatus: 'approved' }
      );
      batch.update(doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id), {
        totalSpent: activeUtsav.totalSpent + target.amount,
      });
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'APPROVE_EXPENSE',
        entryId,
        summary: `Approved expense ₹${target.amount} (${target.titleOrDonorName})`,
        beforeData: auditJson({ approvalStatus: 'pending', amount: target.amount }),
        afterData: auditJson({ approvalStatus: 'approved', amount: target.amount }),
        performedByUid: actorUid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
        await syncPublicSnapshot(
          liveMandal,
          activeUtsav,
          liveEntries.map((e) => (e.id === entryId ? { ...e, approvalStatus: 'approved' } : e))
        );
        showToast('Expense approved!');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}/entries/${entryId}`
        );
      }
    },
    [user, liveMandal, activeUtsav, effectiveRole, liveEntries, currentMember, syncPublicSnapshot, showToast]
  );

  const rejectPendingExpense = useCallback(
    async (entryId: string) => {
      await voidEntry(entryId);
    },
    [voidEntry]
  );

  const requestCashHandover = useCallback(
    async (amount: number) => {
      if (!user || !liveMandal || !activeUtsav || !currentMember) return;
      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const handoverId = `handover_${Date.now()}`;
      const batch = writeBatch(db);
      batch.set(doc(db, 'mandals', liveMandal.id, 'handovers', handoverId), {
        user_id: mandalOwnerUid,
        utsavId: activeUtsav.id,
        collectorUid: user.uid,
        collectorName: currentMember.name,
        amount,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'REQUEST_JAMA',
        entryId: handoverId,
        summary: `${currentMember.name} requested cash handover of ₹${amount}`,
        afterData: auditJson({ collector: currentMember.name, amount, status: 'pending' }),
        performedByUid: user.uid,
        performedByName: currentMember.name,
        timestamp: serverTimestamp(),
      });
      try {
        await batch.commit();
        showToast(`Cash handover request for ₹${amount} sent!`);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `mandals/${liveMandal.id}/handovers/${handoverId}`
        );
      }
    },
    [user, liveMandal, activeUtsav, currentMember, showToast]
  );

  const approveCashHandover = useCallback(
    async (handoverId: string) => {
      if (!user || !liveMandal || effectiveRole !== 'admin') return;
      const handover = liveHandovers.find((h) => h.id === handoverId);
      if (!handover || handover.status === 'confirmed') return;
      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const collector = liveMembers.find((m) => m.uid === handover.collectorUid);
      const actorUid = user.uid;
      const actorName = currentMember?.name || user.displayName || 'Admin';
      const prevCash = collector?.cashInHand ?? 0;
      const nextCash = Math.max(0, prevCash - handover.amount);

      const batch = writeBatch(db);
      batch.update(doc(db, 'mandals', liveMandal.id, 'handovers', handoverId), {
        status: 'confirmed',
      });
      if (collector) {
        batch.update(doc(db, 'mandals', liveMandal.id, 'members', collector.uid), {
          cashInHand: nextCash,
        });
      }
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'APPROVE_JAMA',
        entryId: handoverId,
        summary: `Confirmed Jama ₹${handover.amount} from ${handover.collectorName}`,
        beforeData: auditJson({ status: 'pending', collectorCashInHand: prevCash }),
        afterData: auditJson({ status: 'confirmed', collectorCashInHand: nextCash }),
        performedByUid: actorUid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
        showToast(`Confirmed ₹${handover.amount} Jama from ${handover.collectorName}`);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `mandals/${liveMandal.id}/handovers/${handoverId}`
        );
      }
    },
    [user, liveMandal, effectiveRole, liveHandovers, liveMembers, currentMember, showToast]
  );

  const updateMemberRole = useCallback(
    async (uid: string, role: MemberRole) => {
      if (!liveMandal || effectiveRole !== 'admin') return;
      try {
        await updateDoc(doc(db, 'mandals', liveMandal.id, 'members', uid), { role });
        showToast('Member role updated');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `mandals/${liveMandal.id}/members/${uid}`
        );
      }
    },
    [liveMandal, effectiveRole, showToast]
  );

  const purchaseReceiptPack = useCallback(
    async (
      packId: string,
      paymentDetails?: { paymentRef?: string; paymentMethod?: 'razorpay' | 'upi_utr' }
    ) => {
      if (!user || !liveMandal) throw new Error('Mandal session not active.');
      if (effectiveRole !== 'admin') {
        throw new Error('Only Mandal Admins can purchase WhatsApp receipt packs.');
      }
      const pack = RECEIPT_PACKS.find((p) => p.id === packId);
      if (!pack) throw new Error('Selected credit pack was not found.');

      if (packPurchaseLockRef.current) return;
      packPurchaseLockRef.current = true;

      try {
        const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
        const nextTier = computeNextTier(liveMandal.tierName, pack.tierGrant);
        const rawRef = paymentDetails?.paymentRef?.trim();
        const paymentRef =
          rawRef && rawRef.length >= 4
            ? rawRef.slice(0, 120)
            : `pay_RZP_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        const creditTxId = `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const walletTxId = `wtx_${Date.now()}`;
        const mandalRef = doc(db, 'mandals', liveMandal.id);
        let nextCreditsTotal = getAvailableWhatsAppCredits(liveMandal) + pack.credits;

        try {
          await runTransaction(db, async (tx) => {
            const mandalSnap = await tx.get(mandalRef);
            if (!mandalSnap.exists()) {
              throw new Error('Mandal profile not found.');
            }
            const mData = mandalSnap.data();
            const freshCredits = Math.max(
              0,
              Math.floor(Number(mData.whatsapp_credits ?? mData.whatsappCredits ?? 0))
            );
            nextCreditsTotal = freshCredits + pack.credits;

            tx.update(mandalRef, {
              tierName: nextTier,
              whatsappCredits: nextCreditsTotal,
              whatsapp_credits: nextCreditsTotal,
              updatedAt: serverTimestamp(),
            });

            tx.set(doc(db, 'mandals', liveMandal.id, 'credit_transactions', creditTxId), {
              user_id: mandalOwnerUid,
              id: creditTxId,
              pack_name: pack.name,
              credits_added: pack.credits,
              amount_paid: pack.priceInr,
              payment_ref: paymentRef,
              status: 'completed',
              created_at: serverTimestamp(),
            });

            tx.set(doc(db, 'mandals', liveMandal.id, 'wallet_transactions', walletTxId), {
              user_id: mandalOwnerUid,
              type: 'pack_purchase',
              creditsDelta: pack.credits,
              amountInr: pack.priceInr,
              packName: pack.name,
              razorpayPaymentId: paymentRef,
              createdAt: serverTimestamp(),
            });
          });
          showToast(`+${pack.credits} WhatsApp credits added! (${nextCreditsTotal} remaining)`);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `mandals/${liveMandal.id}`);
        }
      } finally {
        packPurchaseLockRef.current = false;
      }
    },
    [user, liveMandal, effectiveRole, showToast]
  );

  const clearWalletHistory = useCallback(
    async (resetCreditsToTrial = false) => {
      if (!user || !liveMandal) throw new Error('Mandal session not active.');
      if (effectiveRole !== 'admin') {
        throw new Error('Only Mandal Admins can clear wallet history.');
      }

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const walletRef = collection(db, 'mandals', liveMandal.id, 'wallet_transactions');
      const creditRef = collection(db, 'mandals', liveMandal.id, 'credit_transactions');

      let walletDocs: DocumentSnapshot<DocumentData>[] = [];
      let creditDocs: DocumentSnapshot<DocumentData>[] = [];
      try {
        const [wSnap, cSnap] = await Promise.all([
          getDocs(query(walletRef, where('user_id', '==', mandalOwnerUid))),
          getDocs(query(creditRef, where('user_id', '==', mandalOwnerUid))),
        ]);
        walletDocs = wSnap.docs;
        creditDocs = cSnap.docs;
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.LIST,
          `mandals/${liveMandal.id}/wallet_transactions`
        );
      }

      const refsToDelete = [...walletDocs.map((d) => d.ref), ...creditDocs.map((d) => d.ref)];
      const CHUNK_SIZE = 400;

      try {
        for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
          const chunk = refsToDelete.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const ref of chunk) {
            batch.delete(ref);
          }
          await batch.commit();
        }

        if (resetCreditsToTrial) {
          await updateDoc(doc(db, 'mandals', liveMandal.id), {
            tierName: 'Free',
            whatsappCredits: DEFAULT_TRIAL_WHATSAPP_CREDITS,
            whatsapp_credits: DEFAULT_TRIAL_WHATSAPP_CREDITS,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `mandals/${liveMandal.id}/wallet_transactions`
        );
      }

      showToast(
        resetCreditsToTrial
          ? `Past history cleared & wallet reset to ${DEFAULT_TRIAL_WHATSAPP_CREDITS} free credits`
          : 'Past wallet & pack purchase history cleared'
      );
    },
    [user, liveMandal, effectiveRole, showToast]
  );

  const deleteAllUtsavData = useCallback(
    async (): Promise<number> => {
      if (!user || !liveMandal || !activeUtsav) {
        throw new Error('Mandal or Utsav session not active.');
      }
      if (effectiveRole !== 'admin') {
        throw new Error('Only Mandal Admins can delete all data.');
      }

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const entriesRef = collection(
        db,
        'mandals',
        liveMandal.id,
        'utsavs',
        activeUtsav.id,
        'entries'
      );
      const handoversRef = collection(db, 'mandals', liveMandal.id, 'handovers');
      const publicReceiptsRef = collection(db, 'public_receipts');

      let entryDocs: DocumentSnapshot<DocumentData>[] = [];
      let handoverDocs: DocumentSnapshot<DocumentData>[] = [];
      let publicReceiptDocs: DocumentSnapshot<DocumentData>[] = [];

      try {
        const [eSnap, hSnap, pSnap] = await Promise.all([
          getDocs(query(entriesRef, where('user_id', '==', mandalOwnerUid))),
          getDocs(query(handoversRef, where('user_id', '==', mandalOwnerUid))),
          getDocs(query(publicReceiptsRef, where('user_id', '==', mandalOwnerUid))),
        ]);
        entryDocs = eSnap.docs;
        handoverDocs = hSnap.docs.filter((d) => d.data()?.utsavId === activeUtsav.id);
        const entryPublicIds = new Set(
          entryDocs
            .map((d) => d.data()?.publicReceiptId as string | undefined)
            .filter((id): id is string => Boolean(id))
        );
        publicReceiptDocs = pSnap.docs.filter((d) => entryPublicIds.has(d.id));
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.LIST,
          `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}/entries`
        );
      }

      const refsToDelete = [
        ...entryDocs.map((d) => d.ref),
        ...publicReceiptDocs.map((d) => d.ref),
        ...handoverDocs.map((d) => d.ref),
      ];

      const CHUNK_SIZE = 400;
      try {
        for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
          const chunk = refsToDelete.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const ref of chunk) {
            batch.delete(ref);
          }
          await batch.commit();
        }

        const resetBatch = writeBatch(db);
        resetBatch.update(
          doc(db, 'mandals', liveMandal.id, 'utsavs', activeUtsav.id),
          {
            totalCollected: 0,
            totalSpent: 0,
            lastReceiptSeq: 0,
          }
        );

        for (const m of liveMembers) {
          if ((m.cashInHand || 0) !== 0) {
            resetBatch.update(doc(db, 'mandals', liveMandal.id, 'members', m.uid), {
              cashInHand: 0,
            });
          }
        }

        const actorName = (currentMember?.name || user.displayName || 'Admin').slice(0, 100);
        const ts = Date.now();
        resetBatch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_del_all_${ts}`), {
          user_id: mandalOwnerUid,
          action: 'DELETE_ALL_DATA',
          entryId: activeUtsav.id,
          summary: `Deleted all ${entryDocs.length} entries & reset Collected, Spend, In Hand for ${activeUtsav.name}`.slice(
            0,
            300
          ),
          beforeData: auditJson({
            entries: entryDocs.length,
            collected: computedTotals.collected,
            spent: computedTotals.spent,
            inHand: computedTotals.balance,
          }),
          afterData: auditJson({
            entries: 0,
            collected: 0,
            spent: 0,
            inHand: 0,
          }),
          performedByUid: user.uid,
          performedByName: actorName,
          timestamp: serverTimestamp(),
        });

        await resetBatch.commit();

        await syncPublicSnapshot(
          liveMandal,
          { ...activeUtsav, totalCollected: 0, totalSpent: 0, lastReceiptSeq: 0 },
          liveEntries.filter((e) => e.utsavId !== activeUtsav.id)
        );
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `mandals/${liveMandal.id}/utsavs/${activeUtsav.id}`
        );
      }

      showToast('All data (Collected, Spend, In Hand) deleted!');
      return entryDocs.length;
    },
    [
      user,
      liveMandal,
      activeUtsav,
      effectiveRole,
      liveMembers,
      currentMember,
      computedTotals.collected,
      computedTotals.spent,
      computedTotals.balance,
      syncPublicSnapshot,
      liveEntries,
      showToast,
    ]
  );

  const upsertNakashaUnit = useCallback(
    async (unit: Omit<NakashaUnit, 'user_id'> & { user_id?: string }) => {
      if (!user || !liveMandal) return;
      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const { id, ...rest } = unit;
      try {
        await setDoc(
          doc(db, 'mandals', liveMandal.id, 'nakasha', id),
          cleanUndefined({ ...rest, user_id: mandalOwnerUid })
        );
        showToast(`${unit.flatNumber} saved`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `mandals/${liveMandal.id}/nakasha/${id}`);
      }
    },
    [user, liveMandal, showToast]
  );

  const bulkAddNakashaUnits = useCallback(
    async (units: Array<Omit<NakashaUnit, 'user_id'>>): Promise<number> => {
      if (!user || !liveMandal || effectiveRole === 'auditor') return 0;
      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const batch = writeBatch(db);
      const limited = units.slice(0, 150);
      for (const unit of limited) {
        const { id, ...rest } = unit;
        batch.set(
          doc(db, 'mandals', liveMandal.id, 'nakasha', id),
          cleanUndefined({ ...rest, user_id: mandalOwnerUid })
        );
      }
      try {
        await batch.commit();
        showToast(`Added ${limited.length} units to Directory`);
        return limited.length;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `mandals/${liveMandal.id}/nakasha`);
        return 0;
      }
    },
    [user, liveMandal, effectiveRole, showToast]
  );

  const deleteNakashaUnit = useCallback(
    async (unitId: string) => {
      if (!liveMandal || effectiveRole !== 'admin') return;
      try {
        await deleteDoc(doc(db, 'mandals', liveMandal.id, 'nakasha', unitId));
        showToast('Unit removed');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `mandals/${liveMandal.id}/nakasha/${unitId}`
        );
      }
    },
    [liveMandal, effectiveRole, showToast]
  );

  const addVendor = useCallback(
    async (input: {
      name: string;
      category: string;
      phone?: string;
      totalContract: number;
      advancePaid: number;
      dueDate?: string;
      note?: string;
    }) => {
      if (!user || !liveMandal || !activeUtsav) return;
      if (effectiveRole !== 'admin') throw new Error('Only Admin can add vendors');
      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const id = `vnd_${Date.now()}`;
      const totalContract = Math.max(0, Number(input.totalContract) || 0);
      const advancePaid = Math.min(totalContract, Math.max(0, Number(input.advancePaid) || 0));
      const status: Vendor['status'] =
        advancePaid >= totalContract && totalContract > 0
          ? 'paid'
          : advancePaid > 0
          ? 'partial'
          : 'pending';
      const actorName = currentMember?.name || user.displayName || 'Admin';

      const batch = writeBatch(db);
      batch.set(
        doc(db, 'mandals', liveMandal.id, 'vendors', id),
        cleanUndefined({
          user_id: mandalOwnerUid,
          utsavId: activeUtsav.id,
          name: input.name.trim(),
          category: input.category.trim(),
          phone: input.phone?.trim() || undefined,
          totalContract,
          advancePaid,
          dueDate: input.dueDate?.trim() || undefined,
          note: input.note?.trim() || undefined,
          status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'CREATE_VENDOR',
        entryId: id,
        summary: `Added vendor "${input.name.trim()}" (Contract ₹${totalContract}, Advance ₹${advancePaid})`,
        afterData: auditJson({ name: input.name.trim(), totalContract, advancePaid, status }),
        performedByUid: user.uid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });
      try {
        await batch.commit();
        showToast(`Vendor "${input.name.trim()}" added`);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `mandals/${liveMandal.id}/vendors/${id}`);
      }
    },
    [user, liveMandal, activeUtsav, effectiveRole, currentMember, showToast]
  );

  const recordVendorPayment = useCallback(
    async (vendorId: string, additionalAmount: number) => {
      if (!user || !liveMandal || effectiveRole !== 'admin') return;
      const vendor = liveVendors.find((v) => v.id === vendorId);
      if (!vendor || additionalAmount <= 0) return;

      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const nextPaid = Math.min(vendor.totalContract, vendor.advancePaid + additionalAmount);
      const nextStatus: Vendor['status'] =
        nextPaid >= vendor.totalContract ? 'paid' : nextPaid > 0 ? 'partial' : 'pending';
      const actorName = currentMember?.name || user.displayName || 'Admin';

      const batch = writeBatch(db);
      batch.update(doc(db, 'mandals', liveMandal.id, 'vendors', vendorId), {
        advancePaid: nextPaid,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'PAY_VENDOR',
        entryId: vendorId,
        summary: `Paid ₹${additionalAmount} to vendor "${vendor.name}" (Paid ₹${nextPaid}/${vendor.totalContract})`,
        beforeData: auditJson({ advancePaid: vendor.advancePaid, status: vendor.status }),
        afterData: auditJson({ advancePaid: nextPaid, status: nextStatus }),
        performedByUid: user.uid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
        showToast(`Recorded ₹${additionalAmount} payment to ${vendor.name}`);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `mandals/${liveMandal.id}/vendors/${vendorId}`
        );
      }
    },
    [user, liveMandal, effectiveRole, liveVendors, currentMember, showToast]
  );

  const deleteVendor = useCallback(
    async (vendorId: string) => {
      if (!user || !liveMandal || effectiveRole !== 'admin') return;
      const vendor = liveVendors.find((v) => v.id === vendorId);
      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const actorName = currentMember?.name || user.displayName || 'Admin';

      const batch = writeBatch(db);
      batch.delete(doc(db, 'mandals', liveMandal.id, 'vendors', vendorId));
      batch.set(doc(db, 'mandals', liveMandal.id, 'audit_logs', `log_${Date.now()}`), {
        user_id: mandalOwnerUid,
        action: 'DELETE_VENDOR',
        entryId: vendorId,
        summary: `Removed vendor "${vendor?.name || vendorId}"`,
        beforeData: vendor ? auditJson({ name: vendor.name, totalContract: vendor.totalContract }) : undefined,
        performedByUid: user.uid,
        performedByName: actorName,
        timestamp: serverTimestamp(),
      });
      try {
        await batch.commit();
        showToast('Vendor removed');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `mandals/${liveMandal.id}/vendors/${vendorId}`
        );
      }
    },
    [user, liveMandal, effectiveRole, liveVendors, currentMember, showToast]
  );

  const addEvent = useCallback(
    async (evt: Omit<MandalEvent, 'id' | 'user_id'>) => {
      if (!user || !liveMandal || effectiveRole !== 'admin') return;
      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const id = `evt_${Date.now()}`;
      try {
        await setDoc(
          doc(db, 'mandals', liveMandal.id, 'events', id),
          cleanUndefined({ ...evt, user_id: mandalOwnerUid })
        );
        showToast('Event added to Patrika');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `mandals/${liveMandal.id}/events/${id}`);
      }
    },
    [user, liveMandal, effectiveRole, showToast]
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      if (!liveMandal || effectiveRole !== 'admin') return;
      try {
        await deleteDoc(doc(db, 'mandals', liveMandal.id, 'events', eventId));
        showToast('Event removed');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `mandals/${liveMandal.id}/events/${eventId}`
        );
      }
    },
    [liveMandal, effectiveRole, showToast]
  );

  const addDocument = useCallback(
    async (docItem: Omit<MandalDocument, 'id' | 'user_id' | 'createdAt' | 'uploadedBy'>) => {
      if (!user || !liveMandal || effectiveRole !== 'admin') return;
      const mandalOwnerUid = liveMandal.user_id || liveMandal.id;
      const id = `doc_${Date.now()}`;
      const uploadedBy = currentMember?.name || user.displayName || 'Admin';
      try {
        await setDoc(
          doc(db, 'mandals', liveMandal.id, 'documents', id),
          cleanUndefined({
            user_id: mandalOwnerUid,
            title: docItem.title,
            category: docItem.category,
            fileUrl: docItem.fileUrl,
            uploadedBy,
            createdAt: serverTimestamp(),
          })
        );
        showToast('Document saved to vault');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `mandals/${liveMandal.id}/documents/${id}`
        );
      }
    },
    [user, liveMandal, effectiveRole, currentMember, showToast]
  );

  const deleteDocument = useCallback(
    async (docId: string) => {
      if (!liveMandal || effectiveRole !== 'admin') return;
      try {
        await deleteDoc(doc(db, 'mandals', liveMandal.id, 'documents', docId));
        showToast('Document deleted');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `mandals/${liveMandal.id}/documents/${docId}`
        );
      }
    },
    [liveMandal, effectiveRole, showToast]
  );

  const value: MandalContextValue = {
    user,
    authReady,
    dataLoading,
    loadError,
    retryLoad,
    needsOnboarding,
    mandal: liveMandal,
    members: liveMembers,
    currentMember,
    effectiveRole,
    simulatedRole,
    setSimulatedRole,
    utsavs: liveUtsavs,
    activeUtsav,
    setActiveUtsavId: setSelectedUtsavId,
    entries: liveEntries,
    utsavEntries,
    nakasha: liveNakasha,
    vendors: utsavVendors,
    events: liveEvents,
    documents: liveDocuments,
    handovers: liveHandovers,
    walletTransactions: liveWalletTx,
    creditTransactions: liveCreditTx,
    auditLogs: liveAuditLogs,
    language,
    setLanguage,
    tr,
    privacyMasked,
    setPrivacyMasked,
    toast,
    showToast,
    dismissToast,
    loginWithGoogle,
    logout,
    createMandal,
    loadSampleData,
    joinMandalByCode,
    createUtsav,
    deleteUtsav,
    updateCategoryBudgets,
    updateMandalSettings,
    findDuplicateIncome,
    addIncomeEntry,
    addExpenseEntry,
    addGoodsEntry,
    importEntriesBatch,
    updateEntry,
    voidEntry,
    restoreEntry,
    generateReceiptJpegUrl,
    resendWhatsAppReceipt,
    sendAutomatedWhatsAppReceipt,
    approvePendingExpense,
    rejectPendingExpense,
    requestCashHandover,
    approveCashHandover,
    updateMemberRole,
    purchaseReceiptPack,
    clearWalletHistory,
    deleteAllUtsavData,
    upsertNakashaUnit,
    bulkAddNakashaUnits,
    deleteNakashaUnit,
    addVendor,
    recordVendorPayment,
    deleteVendor,
    addEvent,
    deleteEvent,
    addDocument,
    deleteDocument,
    computedTotals,
  };

  return <MandalContext.Provider value={value}>{children}</MandalContext.Provider>;
}

export function useMandal() {
  const ctx = useContext(MandalContext);
  if (!ctx) throw new Error('useMandal must be used inside MandalProvider');
  return ctx;
}
