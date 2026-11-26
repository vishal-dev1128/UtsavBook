import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { EXPENSE_HEADS, INCOME_HEADS, LedgerEntry, PaymentMode } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ImportedLedgerRow {
  id: string;
  selected: boolean;
  entryDate: string;
  type: 'income' | 'expense' | 'goods';
  titleOrDonorName: string;
  flatOrAddress?: string;
  donorPhone?: string;
  head: string;
  amount: number;
  paymentMode: PaymentMode;
  note?: string;
  goodsDescription?: string;
}

export interface ParsedImportResult {
  rows: ImportedLedgerRow[];
  sourceFormat: 'excel' | 'csv' | 'pdf';
  warnings: string[];
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function normalizeDate(raw: unknown): string {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${pad2(raw.getMonth() + 1)}-${pad2(raw.getDate())}`;
  }
  if (typeof raw === 'number' && raw > 25000 && raw < 80000) {
    // Excel serial date
    const utcDays = Math.floor(raw - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    }
  }
  const str = String(raw ?? '').trim();
  if (!str) return todayIso();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${pad2(m)}-${pad2(d)}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmyMatch) {
    const d = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    let y = Number(dmyMatch[3]);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${pad2(m)}-${pad2(d)}`;
    }
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
  }
  return todayIso();
}

function parseAmount(raw: unknown): { value: number; sign: -1 | 0 | 1 } {
  if (typeof raw === 'number') {
    if (Number.isNaN(raw)) return { value: 0, sign: 0 };
    return { value: Math.abs(raw), sign: raw < 0 ? -1 : raw > 0 ? 1 : 0 };
  }
  const str = String(raw ?? '').trim();
  if (!str) return { value: 0, sign: 0 };
  const isNeg = /(?:^|\s)-\s*(?:₹|Rs\.?|INR)?\s*\d|^(?:₹|Rs\.?|INR)?\s*-\s*\d|\bdr\b|\bdebit\b|^\(.*\)$/i.test(
    str
  );
  const isPos = /(?:^|\s)\+\s*(?:₹|Rs\.?|INR)?\s*\d|^(?:₹|Rs\.?|INR)?\s*\+\s*\d|\bcr\b|\bcredit\b/i.test(
    str
  );
  const cleaned = str.replace(/[^0-9.]/g, '');
  const num = Number.parseFloat(cleaned);
  if (!Number.isFinite(num) || num <= 0) return { value: 0, sign: 0 };
  return { value: Math.round(num * 100) / 100, sign: isNeg ? -1 : isPos ? 1 : 0 };
}

function normalizeMode(raw: unknown, type: 'income' | 'expense' | 'goods'): PaymentMode {
  if (type === 'goods') return 'GOODS';
  const s = String(raw ?? '').toUpperCase();
  if (s.includes('UPI') || s.includes('GPAY') || s.includes('PHONEPE') || s.includes('PAYTM')) {
    return 'UPI';
  }
  if (
    s.includes('BANK') ||
    s.includes('NEFT') ||
    s.includes('IMPS') ||
    s.includes('RTGS') ||
    s.includes('CHEQUE') ||
    s.includes('CHQ') ||
    s.includes('ONLINE')
  ) {
    return 'BANK';
  }
  if (s.includes('GOODS') || s.includes('VASTU') || s.includes('KIND')) {
    return 'GOODS';
  }
  return 'CASH';
}

function normalizeHead(raw: unknown, type: 'income' | 'expense' | 'goods'): string {
  const str = String(raw ?? '').trim().slice(0, 60);
  if (str) return str;
  if (type === 'income') return INCOME_HEADS[0];
  if (type === 'expense') return EXPENSE_HEADS[EXPENSE_HEADS.length - 1];
  return 'Vastu / Prasad';
}

function inferTypeFromText(rawType: string, textContext: string, sign: -1 | 0 | 1): 'income' | 'expense' | 'goods' {
  const t = rawType.toLowerCase().trim();
  if (t.includes('good') || t.includes('vastu') || t.includes('kind')) return 'goods';
  if (
    t.includes('exp') ||
    t.includes('javak') ||
    t.includes('kharch') ||
    t.includes('debit') ||
    t === 'dr' ||
    t.includes('out') ||
    t.includes('paid') ||
    t.includes('spent') ||
    t.includes('withdraw') ||
    t.includes('payment')
  ) {
    return 'expense';
  }
  if (
    t.includes('inc') ||
    t.includes('vargani') ||
    t.includes('chanda') ||
    t.includes('jama') ||
    t.includes('credit') ||
    t === 'cr' ||
    t.includes('donat') ||
    t.includes('receipt') ||
    t.includes('collect') ||
    t.includes('deposit') ||
    t.includes('received')
  ) {
    return 'income';
  }

  if (sign < 0) return 'expense';
  if (sign > 0) return 'income';

  const ctx = textContext.toLowerCase();
  if (
    /\b(expense|javak|kharch|mandap|decoration|sound|lighting|catering|prasad|generator|electrical|bill|vendor|rent|paid)\b/.test(
      ctx
    )
  ) {
    return 'expense';
  }
  return 'income';
}

function normalizeHeaderKey(h: unknown): string {
  return String(h ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findHeaderRowIndex(matrix: unknown[][]): number {
  const limit = Math.min(matrix.length, 10);
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < limit; i++) {
    const row = matrix[i] || [];
    let score = 0;
    for (const cell of row) {
      const k = normalizeHeaderKey(cell);
      if (!k) continue;
      if (
        k.includes('date') ||
        k.includes('donor') ||
        k.includes('title') ||
        k.includes('name') ||
        k.includes('particular') ||
        k.includes('amount') ||
        k.includes('credit') ||
        k.includes('debit') ||
        k.includes('type') ||
        k.includes('head') ||
        k.includes('category') ||
        k.includes('mode')
      ) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestScore >= 2 ? bestIdx : 0;
}

export function parseSpreadsheetBuffer(
  buffer: ArrayBuffer,
  fileName: string
): ParsedImportResult {
  const isCsv = fileName.toLowerCase().endsWith('.csv');
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { rows: [], sourceFormat: isCsv ? 'csv' : 'excel', warnings: ['No worksheet found in file.'] };
  }

  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (matrix.length < 2) {
    return {
      rows: [],
      sourceFormat: isCsv ? 'csv' : 'excel',
      warnings: ['File has no transaction rows to import.'],
    };
  }

  const headerIdx = findHeaderRowIndex(matrix);
  const headers = (matrix[headerIdx] || []).map(normalizeHeaderKey);

  const usedCols = new Set<number>();
  const claimCol = (exact: string[], partial: string[] = []): number => {
    for (const c of exact) {
      const idx = headers.findIndex((h, i) => !usedCols.has(i) && h === c);
      if (idx >= 0) {
        usedCols.add(idx);
        return idx;
      }
    }
    for (const c of partial) {
      const idx = headers.findIndex((h, i) => !usedCols.has(i) && h.includes(c));
      if (idx >= 0) {
        usedCols.add(idx);
        return idx;
      }
    }
    return -1;
  };

  // Claim non-numeric / metadata columns first so short tokens like "cr" / "dr" never steal text columns (e.g. "Flat / Address" or "Description")
  const dateCol = claimCol(['date', 'entrydate', 'tarikh'], ['date', 'tarikh']);
  const typeCol = claimCol(['type', 'entrytype', 'kind'], ['entrytype', 'type']);
  const flatCol = claimCol(
    ['flat', 'address', 'flataddress', 'wing', 'unit'],
    ['flat', 'address', 'wing']
  );
  const phoneCol = claimCol(
    ['phone', 'mobile', 'contact', 'phoneno', 'mobileno', 'whatsapp', 'whatsappno', 'whatsappnumber'],
    ['phone', 'mobile', 'contact']
  );
  const headCol = claimCol(['head', 'category', 'headcategory', 'ledger'], ['head', 'category']);
  const modeCol = claimCol(
    ['mode', 'paymentmode', 'paymentmethod', 'method', 'via'],
    ['paymentmode', 'mode', 'method']
  );
  const noteCol = claimCol(['note', 'narration', 'comment', 'remarks'], ['note', 'narration', 'comment']);
  const titleCol = claimCol(
    ['donortitle', 'donor', 'title', 'particular', 'particulars', 'description', 'name', 'party', 'remark'],
    ['donortitle', 'donor', 'title', 'particular', 'description', 'party', 'name', 'remark']
  );
  const amountCol = claimCol(
    ['amount', 'amountinr', 'amt', 'inr', 'rs', 'rsinr', 'total'],
    ['amount', 'amt', 'inr']
  );
  const creditCol = claimCol(
    ['credit', 'cr', 'cramount', 'creditamount', 'deposit', 'inflow', 'collected'],
    ['credit', 'deposit', 'inflow']
  );
  const debitCol = claimCol(
    ['debit', 'dr', 'dramount', 'debitamount', 'withdrawal', 'outflow', 'spent'],
    ['debit', 'withdrawal', 'outflow']
  );

  const warnings: string[] = [];
  if (titleCol === -1 && amountCol === -1 && creditCol === -1 && debitCol === -1) {
    warnings.push(
      'Could not automatically detect Name/Donor or Amount columns. Please use columns like Date, Type, Donor / Title, Head, Amount, Payment Mode.'
    );
  }

  const rows: ImportedLedgerRow[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const r = matrix[i];
    if (!r || r.every((c) => String(c ?? '').trim() === '')) continue;

    const rawTitle = titleCol >= 0 ? String(r[titleCol] ?? '').trim() : '';
    const rawNote = noteCol >= 0 ? String(r[noteCol] ?? '').trim() : '';
    const rawHead = headCol >= 0 ? String(r[headCol] ?? '').trim() : '';
    const rawType = typeCol >= 0 ? String(r[typeCol] ?? '').trim() : '';

    // Skip summary total rows
    if (/^(total|grand total|net balance|closing balance|opening balance)\b/i.test(rawTitle)) {
      continue;
    }

    let amount = 0;
    let sign: -1 | 0 | 1 = 0;
    let typeFromCols: 'income' | 'expense' | 'goods' | null = null;

    if (typeCol >= 0 && amountCol >= 0) {
      const parsed = parseAmount(r[amountCol]);
      amount = parsed.value;
      sign = parsed.sign;
    }

    if (amount === 0 && (creditCol >= 0 || debitCol >= 0)) {
      const cr = creditCol >= 0 ? parseAmount(r[creditCol]) : { value: 0, sign: 0 as const };
      const dr = debitCol >= 0 ? parseAmount(r[debitCol]) : { value: 0, sign: 0 as const };
      if (cr.value > 0 && dr.value === 0) {
        amount = cr.value;
        sign = 1;
        typeFromCols = 'income';
      } else if (dr.value > 0 && cr.value === 0) {
        amount = dr.value;
        sign = -1;
        typeFromCols = 'expense';
      }
    }

    if (amount === 0 && amountCol >= 0) {
      const parsed = parseAmount(r[amountCol]);
      amount = parsed.value;
      sign = parsed.sign;
    }

    const type =
      typeFromCols ||
      inferTypeFromText(rawType, `${rawTitle} ${rawHead} ${rawNote}`, sign);

    if (type !== 'goods' && amount <= 0) continue;

    const title = (rawTitle || rawNote || rawHead || 'Imported Entry').slice(0, 140);
    const flatOrAddress = flatCol >= 0 ? String(r[flatCol] ?? '').trim().slice(0, 140) : '';
    const donorPhone = phoneCol >= 0 ? String(r[phoneCol] ?? '').trim().slice(0, 24) : '';
    const entryDate = dateCol >= 0 ? normalizeDate(r[dateCol]) : todayIso();
    const paymentMode = normalizeMode(modeCol >= 0 ? r[modeCol] : '', type);
    const head = normalizeHead(rawHead, type);

    rows.push({
      id: `imp_row_${i}_${Math.random().toString(36).slice(2, 6)}`,
      selected: true,
      entryDate,
      type,
      titleOrDonorName: title,
      flatOrAddress: flatOrAddress || undefined,
      donorPhone: donorPhone || undefined,
      head,
      amount,
      paymentMode,
      note: rawNote ? rawNote.slice(0, 300) : undefined,
      goodsDescription: type === 'goods' ? (rawNote || title).slice(0, 240) : undefined,
    });
  }

  if (rows.length === 0 && warnings.length === 0) {
    warnings.push('No valid income or expense rows with amounts > 0 were found.');
  }

  return { rows, sourceFormat: isCsv ? 'csv' : 'excel', warnings };
}

export async function parsePdfBuffer(buffer: ArrayBuffer): Promise<ParsedImportResult> {
  const warnings: string[] = [];
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const rawItems: Array<{ str: string; x: number; y: number }> = [];
    for (const it of content.items) {
      if ('str' in it && 'transform' in it) {
        const trimmed = it.str.trim();
        if (trimmed.length > 0) {
          rawItems.push({
            str: trimmed,
            x: it.transform[4] ?? 0,
            y: it.transform[5] ?? 0,
          });
        }
      }
    }

    // Group items that share the same visual line (Y within 4pt)
    const rowBuckets: Array<{ y: number; items: Array<{ str: string; x: number }> }> = [];
    for (const item of rawItems) {
      let bucket = rowBuckets.find((b) => Math.abs(b.y - item.y) <= 4);
      if (!bucket) {
        bucket = { y: item.y, items: [] };
        rowBuckets.push(bucket);
      }
      bucket.items.push({ str: item.str, x: item.x });
    }

    // Top-to-bottom (higher PDF Y first), then left-to-right
    rowBuckets.sort((a, b) => b.y - a.y);
    for (const bucket of rowBuckets) {
      bucket.items.sort((a, b) => a.x - b.x);
      const joined = bucket.items.map((i) => i.str).join('  ').trim();
      if (joined) lines.push(joined);
    }
  }

  if (lines.length === 0) {
    warnings.push(
      'This PDF appears to be a scanned image with no selectable text. Export your sheet as Excel/CSV or a text-based PDF to import.'
    );
    return { rows: [], sourceFormat: 'pdf', warnings };
  }

  const rows: ImportedLedgerRow[] = [];
  const skipPattern =
    /^(total collected|total spent|net balance|mandalbook|date\s+type|payment mode summary|category|summary|generated on|page \d+ of \d+)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skipPattern.test(line)) continue;

    // Look for an amount token like +Rs.1,101 or -Rs.500 or ₹1,500 or 2,500.00 Cr/Dr
    const amountMatches = Array.from(
      line.matchAll(/([+-]?\s*(?:Rs\.?|₹|INR)?\s*[+-]?\s*\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?(?:\s*(?:Cr|Dr))?)/gi)
    );
    if (amountMatches.length === 0) continue;

    // Pick the rightmost currency-like token that isn't part of a date or receipt sequence
    let chosenMatch: RegExpMatchArray | null = null;
    for (let m = amountMatches.length - 1; m >= 0; m--) {
      const candidate = amountMatches[m];
      const token = candidate[0].trim();
      const idx = candidate.index ?? 0;
      const before = line.slice(Math.max(0, idx - 2), idx);
      const after = line.slice(idx + token.length, idx + token.length + 2);
      // Skip parts of YYYY-MM-DD, DD/MM/YYYY, or MB-1-0001
      if (/[-/:]$/.test(before) || /^[-/:]/.test(after)) continue;
      // Prefer tokens with Rs/₹/Cr/Dr/+-/comma or decimal, or standalone numbers >= 10
      const parsed = parseAmount(token);
      if (parsed.value <= 0) continue;
      if (
        /(?:Rs|₹|INR|Cr|Dr|[+-]|,|\.)/i.test(token) ||
        parsed.value >= 10
      ) {
        chosenMatch = candidate;
        break;
      }
    }

    if (!chosenMatch) continue;
    const rawAmountToken = chosenMatch[0];
    const parsedAmt = parseAmount(rawAmountToken);
    if (parsedAmt.value <= 0) continue;

    // Extract optional date at start or anywhere in line
    const dateMatch = line.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/);
    const entryDate = dateMatch ? normalizeDate(dateMatch[1]) : todayIso();

    // Remove date and amount token to parse middle particulars
    let remainder = line;
    if (dateMatch) remainder = remainder.replace(dateMatch[0], ' ');
    remainder = remainder.replace(rawAmountToken, ' ').replace(/\s{2,}/g, '  ').trim();

    // Remove common receipt number prefix like MB-1-0001 or INCOME/EXPENSE
    let explicitType = '';
    const typeTokenMatch = remainder.match(/\b(INCOME|EXPENSE|GOODS|VARGNI|VARGANI|JAVAK|KHARCH)\b/i);
    if (typeTokenMatch) {
      explicitType = typeTokenMatch[1];
      remainder = remainder.replace(typeTokenMatch[0], '').trim();
    }
    remainder = remainder.replace(/\b[A-Z]{1,5}-\d+-\d{3,6}\b/g, '').trim();

    // Detect payment mode
    const modeMatch = remainder.match(/\b(UPI|CASH|BANK|NEFT|IMPS|RTGS|CHEQUE|GOODS)\b/i);
    const modeRaw = modeMatch ? modeMatch[1] : '';
    if (modeMatch) {
      remainder = remainder.replace(modeMatch[0], '').replace(/[·•|]+$/g, '').trim();
    }

    const parts = remainder
      .split(/\s{2,}|\s·\s|\s\|\s/)
      .map((p) => p.trim())
      .filter(Boolean);

    const title = (parts[0] || 'Imported PDF Entry').slice(0, 140);
    const headCandidate = parts.length > 1 ? parts[parts.length - 1] : '';
    const type = inferTypeFromText(explicitType, `${line}`, parsedAmt.sign);
    const paymentMode = normalizeMode(modeRaw, type);
    const head = normalizeHead(headCandidate, type);

    rows.push({
      id: `pdf_row_${i}_${Math.random().toString(36).slice(2, 6)}`,
      selected: true,
      entryDate,
      type,
      titleOrDonorName: title,
      head,
      amount: parsedAmt.value,
      paymentMode,
      note: 'Imported from PDF',
    });
  }

  if (rows.length === 0) {
    warnings.push(
      'No ledger transaction rows could be matched from this PDF. Try uploading an Excel (.xlsx/.csv) file or a MandalBook-exported PDF.'
    );
  }

  return { rows, sourceFormat: 'pdf', warnings };
}

export async function parseLedgerImportFile(file: File): Promise<ParsedImportResult> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.pdf')) {
    return parsePdfBuffer(buffer);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    return parseSpreadsheetBuffer(buffer, file.name);
  }
  throw new Error('Unsupported file format. Please upload a .pdf, .xlsx, .xls, or .csv file.');
}

export function downloadExcelLedger(entries: LedgerEntry[], filename: string) {
  const active = entries.filter((e) => !e.isVoided);
  const rows = active.map((e) => ({
    Date: e.entryDate,
    Type: e.type.toUpperCase(),
    'Receipt No': e.receiptNumber || '',
    'Donor / Title': e.titleOrDonorName,
    'Flat / Address': e.flatOrAddress || '',
    Phone: e.donorPhone || '',
    'Head / Category': e.head,
    'Amount (INR)': e.amount,
    'Payment Mode': e.paymentMode,
    'Collector / Paid By': e.createdByName,
    'Approval Status': e.approvalStatus,
    'WhatsApp Status': e.whatsappStatus,
    Note: e.note || e.goodsDescription || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'MandalBook Ledger');
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function downloadImportTemplateExcel() {
  const sampleRows = [
    {
      Date: todayIso(),
      Type: 'INCOME',
      'Donor / Title': 'Ramesh Kulkarni',
      'Flat / Address': 'A-101',
      Phone: '9822011223',
      'Head / Category': 'Vargani / Chanda',
      'Amount (INR)': 1101,
      'Payment Mode': 'UPI',
      Note: 'Ganeshotsav Vargani',
    },
    {
      Date: todayIso(),
      Type: 'EXPENSE',
      'Donor / Title': 'Shree Tent & Mandap Decorators',
      'Flat / Address': '',
      Phone: '',
      'Head / Category': 'Mandap & Decoration',
      'Amount (INR)': 2500,
      'Payment Mode': 'CASH',
      Note: 'Advance payment',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
  XLSX.writeFile(wb, 'MandalBook-Import-Template.xlsx');
}
