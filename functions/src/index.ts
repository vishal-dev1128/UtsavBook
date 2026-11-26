/**
 * MandalBook — Firebase Cloud Functions (Node.js 20 / TypeScript)
 * Production backend workflows for:
 *  1. createIncomeAndSendWhatsApp (atomic receipt numbering, WhatsApp dispatch & credit refund on failure)
 *  2. createRazorpayOrder & razorpayWebhook (prepaid Bronze/Silver/Gold WhatsApp receipt pack purchases)
 *  3. approveCashHandover & approvePendingEntry (Treasury Jama reconciliation & collector expense approval)
 */

import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();

const PACK_MAP: Record<string, { name: string; credits: number; amountInr: number; tier: 'Bronze' | 'Silver' | 'Gold' }> = {
  pack_starter_100: { name: 'Starter Pack', credits: 100, amountInr: 99, tier: 'Bronze' },
  pack_utsav_300: { name: 'Utsav Pack', credits: 300, amountInr: 249, tier: 'Silver' },
  pack_mega_700: { name: 'Mega Mandal Pack', credits: 700, amountInr: 499, tier: 'Gold' },
  pack_bronze_100: { name: 'Starter Pack', credits: 100, amountInr: 99, tier: 'Bronze' },
  pack_silver_300: { name: 'Utsav Pack', credits: 300, amountInr: 249, tier: 'Silver' },
  pack_gold_700: { name: 'Mega Mandal Pack', credits: 700, amountInr: 499, tier: 'Gold' },
};

export const createIncomeAndSendWhatsApp = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  const uid = request.auth.uid;
  const {
    mandalId,
    utsavId,
    donorName,
    flatOrAddress,
    donorPhone,
    head,
    amount,
    paymentMode,
    entryDate,
    note,
    receiptImageUrl,
    autoSendWhatsApp,
  } = request.data as Record<string, unknown>;

  if (typeof mandalId !== 'string' || typeof utsavId !== 'string' || typeof donorName !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing required mandalId, utsavId, or donorName.');
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new HttpsError('invalid-argument', 'Amount must be greater than zero.');
  }

  const mandalRef = db.doc(`mandals/${mandalId}`);
  const utsavRef = db.doc(`mandals/${mandalId}/utsavs/${utsavId}`);
  const memberRef = db.doc(`mandals/${mandalId}/members/${uid}`);

  const result = await db.runTransaction(async (tx) => {
    const [mandalSnap, utsavSnap, memberSnap] = await Promise.all([
      tx.get(mandalRef),
      tx.get(utsavRef),
      tx.get(memberRef),
    ]);

    if (!mandalSnap.exists || !utsavSnap.exists || !memberSnap.exists) {
      throw new HttpsError('not-found', 'Mandal, Utsav, or Member record not found.');
    }
    const member = memberSnap.data()!;
    if (member.status !== 'active' || (member.role !== 'admin' && member.role !== 'collector')) {
      throw new HttpsError('permission-denied', 'Only active Admins or Collectors can add income.');
    }

    const mandal = mandalSnap.data()!;
    const utsav = utsavSnap.data()!;
    const nextSeq = Number(utsav.lastReceiptSeq || 0) + 1;
    const receiptNumber = `${mandal.receiptPrefix}-${String(nextSeq).padStart(4, '0')}`;
    const publicReceiptId = `pub_${Date.now().toString(36)}_${nextSeq}`;
    const entryRef = db.collection(`mandals/${mandalId}/utsavs/${utsavId}/entries`).doc();

    const currentCredits = Number(mandal.whatsapp_credits ?? mandal.whatsappCredits ?? 0);
    const shouldSendWa = Boolean(autoSendWhatsApp) && currentCredits > 0 && Boolean(donorPhone);

    const validReceiptImageUrl =
      typeof receiptImageUrl === 'string' && receiptImageUrl.length <= 2000
        ? receiptImageUrl
        : null;

    const ownerUid = String(mandal.user_id || mandal.ownerId || uid);

    tx.set(entryRef, {
      user_id: ownerUid,
      type: 'income',
      receiptNumber,
      publicReceiptId,
      titleOrDonorName: donorName,
      flatOrAddress: flatOrAddress || null,
      donorPhone: donorPhone || null,
      head: String(head || 'Vargani / Chanda'),
      amount: numericAmount,
      paymentMode: String(paymentMode || 'CASH'),
      receiptImageUrl: validReceiptImageUrl,
      note: note || null,
      whatsappStatus: shouldSendWa ? 'sent' : 'not_sent',
      approvalStatus: 'approved',
      createdByUid: uid,
      createdByName: String(member.name || 'Collector'),
      isVoided: false,
      entryDate: String(entryDate || new Date().toISOString().slice(0, 10)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.update(utsavRef, {
      lastReceiptSeq: nextSeq,
      totalCollected: admin.firestore.FieldValue.increment(numericAmount),
    });

    if (paymentMode === 'CASH') {
      tx.update(memberRef, {
        cashInHand: admin.firestore.FieldValue.increment(numericAmount),
      });
    }

    if (shouldSendWa) {
      tx.update(mandalRef, {
        whatsappCredits: admin.firestore.FieldValue.increment(-1),
        whatsapp_credits: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      tx.set(db.collection(`mandals/${mandalId}/wallet_transactions`).doc(), {
        user_id: ownerUid,
        type: 'receipt_sent',
        creditsDelta: -1,
        amountInr: 0,
        packName: `WhatsApp Receipt ${receiptNumber}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    tx.set(db.doc(`public_receipts/${publicReceiptId}`), {
      user_id: ownerUid,
      publicReceiptId,
      mandalId,
      mandalName: mandal.name,
      mandalAddress: mandal.address || null,
      estYear: mandal.estYear || '2026',
      utsavName: utsav.name,
      receiptNumber,
      donorName,
      flatOrAddress: flatOrAddress || null,
      amount: numericAmount,
      paymentMode: String(paymentMode || 'CASH'),
      date: String(entryDate || new Date().toISOString().slice(0, 10)),
      receiptImageUrl: validReceiptImageUrl,
      isVerified: Boolean(mandal.isVerified),
      isVoided: false,
    });

    return {
      entryId: entryRef.id,
      receiptNumber,
      publicReceiptId,
      receiptImageUrl: validReceiptImageUrl,
      shouldSendWa,
    };
  });

  // External WhatsApp Cloud API / Interakt dispatch with automatic credit refund on failure
  if (result.shouldSendWa && typeof donorPhone === 'string') {
    try {
      const apiUrl = process.env.WHATSAPP_API_URL;
      const apiToken = process.env.WHATSAPP_API_TOKEN;
      if (apiUrl && apiToken) {
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: donorPhone,
            receiptNumber: result.receiptNumber,
            amount: numericAmount,
            mediaUrl: result.receiptImageUrl,
            verifyPath: `/verify/${result.publicReceiptId}`,
          }),
        });
        if (!resp.ok) throw new Error(`WhatsApp gateway HTTP ${resp.status}`);
      }
    } catch {
      await db.runTransaction(async (tx) => {
        const mandalSnap = await tx.get(mandalRef);
        const ownerUid = String(mandalSnap.data()?.user_id || mandalSnap.data()?.ownerId || uid);
        tx.update(db.doc(`mandals/${mandalId}/utsavs/${utsavId}/entries/${result.entryId}`), {
          whatsappStatus: 'failed',
        });
        tx.update(mandalRef, {
          whatsappCredits: admin.firestore.FieldValue.increment(1),
          whatsapp_credits: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(db.collection(`mandals/${mandalId}/wallet_transactions`).doc(), {
          user_id: ownerUid,
          type: 'failed_refund',
          creditsDelta: 1,
          amountInr: 0,
          packName: `Refund ${result.receiptNumber}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    }
  }

  return result;
});

export const createRazorpayOrder = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { mandalId, packId } = request.data as { mandalId: string; packId: string };
  const pack = PACK_MAP[packId];
  if (!pack) throw new HttpsError('invalid-argument', 'Unknown receipt pack.');

  return {
    orderId: `order_${Date.now()}`,
    mandalId,
    packId,
    amountPaise: pack.amountInr * 100,
    currency: 'INR',
    credits: pack.credits,
  };
});

export const razorpayWebhook = onRequest(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  if (secret && signature) {
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
    if (expected !== signature) {
      res.status(400).send('Invalid signature');
      return;
    }
  }

  const payment = req.body?.payload?.payment?.entity;
  const mandalId = payment?.notes?.mandalId as string | undefined;
  const packId = payment?.notes?.packId as string | undefined;
  const pack = packId ? PACK_MAP[packId] : undefined;

  if (!mandalId || !pack) {
    res.status(200).json({ ignored: true });
    return;
  }

  await db.runTransaction(async (tx) => {
    const mandalRef = db.doc(`mandals/${mandalId}`);
    const mandalSnap = await tx.get(mandalRef);
    const ownerUid = String(mandalSnap.data()?.user_id || mandalSnap.data()?.ownerId || '');
    const creditTxRef = db.collection(`mandals/${mandalId}/credit_transactions`).doc();
    tx.update(mandalRef, {
      whatsappCredits: admin.firestore.FieldValue.increment(pack.credits),
      whatsapp_credits: admin.firestore.FieldValue.increment(pack.credits),
      tierName: pack.tier,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(creditTxRef, {
      user_id: ownerUid,
      id: creditTxRef.id,
      pack_name: pack.name,
      credits_added: pack.credits,
      amount_paid: pack.amountInr,
      payment_ref: String(payment.id || `pay_${Date.now()}`),
      status: 'completed',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(db.collection(`mandals/${mandalId}/wallet_transactions`).doc(), {
      user_id: ownerUid,
      type: 'pack_purchase',
      creditsDelta: pack.credits,
      amountInr: pack.amountInr,
      packName: pack.name,
      razorpayPaymentId: payment.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  res.status(200).json({ ok: true });
});

export const approveCashHandover = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { mandalId, handoverId } = request.data as { mandalId: string; handoverId: string };
  const adminSnap = await db.doc(`mandals/${mandalId}/members/${request.auth.uid}`).get();
  if (adminSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin role required.');
  }

  await db.runTransaction(async (tx) => {
    const handoverRef = db.doc(`mandals/${mandalId}/handovers/${handoverId}`);
    const snap = await tx.get(handoverRef);
    if (!snap.exists || snap.data()?.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Handover not pending.');
    }
    const { collectorUid, amount } = snap.data()!;
    tx.update(handoverRef, { status: 'confirmed' });
    tx.update(db.doc(`mandals/${mandalId}/members/${collectorUid}`), {
      cashInHand: admin.firestore.FieldValue.increment(-Number(amount)),
    });
  });
  return { ok: true };
});

export const approvePendingEntry = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { mandalId, utsavId, entryId } = request.data as {
    mandalId: string;
    utsavId: string;
    entryId: string;
  };
  const adminSnap = await db.doc(`mandals/${mandalId}/members/${request.auth.uid}`).get();
  if (adminSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin role required.');
  }

  await db.runTransaction(async (tx) => {
    const entryRef = db.doc(`mandals/${mandalId}/utsavs/${utsavId}/entries/${entryId}`);
    const snap = await tx.get(entryRef);
    if (!snap.exists || snap.data()?.approvalStatus !== 'pending') {
      throw new HttpsError('failed-precondition', 'Entry not pending.');
    }
    tx.update(entryRef, { approvalStatus: 'approved' });
    tx.update(db.doc(`mandals/${mandalId}/utsavs/${utsavId}`), {
      totalSpent: admin.firestore.FieldValue.increment(Number(snap.data()?.amount || 0)),
    });
  });
  return { ok: true };
});
