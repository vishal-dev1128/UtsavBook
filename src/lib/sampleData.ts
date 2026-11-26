import { LedgerEntry, MandalEvent, NakashaUnit } from '../types';

export interface OptionalSamplePayload {
  entries: LedgerEntry[];
  nakasha: NakashaUnit[];
  events: MandalEvent[];
}

/**
 * Generates an optional sample dataset strictly scoped to the signed-in owner's `user_id`.
 * NEVER called automatically on login, signup, or onboarding — only when the user
 * explicitly taps "Load sample data" on an empty ledger.
 */
export function buildOptionalSampleData(params: {
  userId: string;
  ownerName: string;
  utsavId: string;
  receiptPrefix: string;
}): OptionalSamplePayload {
  const { userId, ownerName, utsavId, receiptPrefix } = params;
  const stamp = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const entries: LedgerEntry[] = [
    {
      id: `sample_inc_${stamp}_1`,
      user_id: userId,
      utsavId,
      type: 'income',
      receiptNumber: `${receiptPrefix}-0001`,
      publicReceiptId: `pub_${stamp}_1`,
      titleOrDonorName: 'Sample Donor (Wing A)',
      flatOrAddress: 'Flat A-101',
      head: 'Vargani / Chanda',
      amount: 1101,
      paymentMode: 'UPI',
      note: 'Sample entry — editable or voidable anytime',
      whatsappStatus: 'not_sent',
      approvalStatus: 'approved',
      createdByUid: userId,
      createdByName: ownerName,
      isVoided: false,
      entryDate: today,
      createdAt: nowIso,
    },
    {
      id: `sample_inc_${stamp}_2`,
      user_id: userId,
      utsavId,
      type: 'income',
      receiptNumber: `${receiptPrefix}-0002`,
      publicReceiptId: `pub_${stamp}_2`,
      titleOrDonorName: 'Sample Donor (Wing B)',
      flatOrAddress: 'Flat B-204',
      head: 'Aarti Plate',
      amount: 501,
      paymentMode: 'CASH',
      whatsappStatus: 'not_sent',
      approvalStatus: 'approved',
      createdByUid: userId,
      createdByName: ownerName,
      isVoided: false,
      entryDate: today,
      createdAt: nowIso,
    },
    {
      id: `sample_exp_${stamp}_1`,
      user_id: userId,
      utsavId,
      type: 'expense',
      titleOrDonorName: 'Sample Pooja Samagri & Flowers',
      flatOrAddress: 'Local Market',
      head: 'Aarti & Pooja Samagri',
      amount: 450,
      paymentMode: 'CASH',
      note: 'Sample expense — editable or voidable anytime',
      whatsappStatus: 'not_sent',
      approvalStatus: 'approved',
      createdByUid: userId,
      createdByName: ownerName,
      isVoided: false,
      entryDate: today,
      createdAt: nowIso,
    },
  ];

  const nakasha: NakashaUnit[] = [
    {
      id: `sample_unit_${stamp}_1`,
      user_id: userId,
      wingName: 'Wing A',
      flatNumber: 'A-101',
      residentName: 'Sample Flat A-101',
      status: 'collected',
      donationAmount: 1101,
      assignedCollectorUid: userId,
      assignedCollectorName: ownerName,
    },
    {
      id: `sample_unit_${stamp}_2`,
      user_id: userId,
      wingName: 'Wing A',
      flatNumber: 'A-102',
      residentName: 'Sample Flat A-102',
      status: 'pending',
      donationAmount: 0,
      assignedCollectorUid: userId,
      assignedCollectorName: ownerName,
    },
  ];

  const events: MandalEvent[] = [
    {
      id: `sample_evt_${stamp}_1`,
      user_id: userId,
      title: 'Sthapana & Maha-Aarti',
      date: today,
      time: '09:00 AM',
      location: 'Main Mandap',
    },
  ];

  return { entries, nakasha, events };
}
