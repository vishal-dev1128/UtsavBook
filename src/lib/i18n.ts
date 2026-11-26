import { jsPDF } from 'jspdf';
import { EntryType, Language, LedgerEntry, Mandal, MandalMember, Utsav } from '../types';

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    appName: 'UtsavBook',
    tagline: 'Mandal ka hisaab, sabke saamne.',
    home: 'Home',
    entries: 'Entries',
    reports: 'Reports',
    alerts: 'Alerts',
    mandal: 'Mandal',
    thisUtsav: 'THIS UTSAV',
    collected: 'Collected',
    spent: 'Spent',
    inHand: 'In hand',
    netBalance: 'Net Balance',
    addIncome: '+ Income',
    addExpense: '− Expense',
    addGoods: '+ Goods',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View all',
    all: 'All',
    income: 'Income',
    expense: 'Expense',
    goods: 'Goods',
    searchPlaceholder: 'Search donor, flat, head, receipt no...',
    byHead: 'By head',
    collectors: 'Collectors',
    byMode: 'By mode',
    filters: 'Filters',
    order: 'Order',
    today: 'Today',
    last7Days: 'Last 7 days',
    last30Days: 'Last 30 days',
    thisMonth: 'This month',
    fullUtsav: 'Full Utsav',
    nothingPending: 'Nothing pending',
    nothingPendingSub: 'All collector expenses, Jama cash handovers, and WhatsApp receipts are clear.',
    receiptsLeft: 'receipts left',
    buyCredits: 'Buy Receipt Pack',
    joinCode: 'Join code',
    copyCode: 'Copy',
    copied: 'Copied',
    vargani: 'Vargani',
    javak: 'Javak',
    cash: 'Cash',
    upi: 'UPI',
    bank: 'Bank',
    saveEntry: 'Save Entry',
    sendWhatsApp: 'Send on WhatsApp',
    downloadReceipt: 'Save JPEG',
    exportPdf: 'Export PDF',
    exportCsv: 'Export Excel / CSV',
    shareSummary: 'Share Summary Poster',
    publicLedger: 'Public Transparency Page',
    language: 'Language',
    logout: 'Sign Out',
  },
  mr: {
    appName: 'UtsavBook',
    tagline: 'मंडळाचा हिशोब, सर्वांसमोर.',
    home: 'मुख्यपृष्ठ',
    entries: 'नोंदी',
    reports: 'अहवाल',
    alerts: 'सूचना',
    mandal: 'मंडळ',
    thisUtsav: 'चालू उत्सव',
    collected: 'जमा वर्गणी',
    spent: 'खर्च (जावक)',
    inHand: 'शिल्लक रक्कम',
    netBalance: 'निव्वळ शिल्लक',
    addIncome: '+ जमा (वर्गणी)',
    addExpense: '− खर्च',
    addGoods: '+ वस्तू भेट',
    recentTransactions: 'अलीकडील व्यवहार',
    viewAll: 'सर्व पहा',
    all: 'सर्व',
    income: 'जमा',
    expense: 'खर्च',
    goods: 'वस्तू',
    searchPlaceholder: 'नाव, फ्लॅट, पावती क्र. शोधा...',
    byHead: 'विभागानुसार',
    collectors: 'कार्यकर्ते',
    byMode: 'पद्धतीनुसार',
    filters: 'फिल्टर',
    order: 'क्रम',
    today: 'आज',
    last7Days: 'मागील ७ दिवस',
    last30Days: 'मागील ३० दिवस',
    thisMonth: 'हा महिना',
    fullUtsav: 'संपूर्ण उत्सव',
    nothingPending: 'काहीही प्रलंबित नाही',
    nothingPendingSub: 'सर्व खर्च मंजुरी, जमा रोख रक्कम व व्हॉट्सॲप पावत्या पूर्ण आहेत.',
    receiptsLeft: 'पावत्या शिल्लक',
    buyCredits: 'पावती पॅक खरेदी',
    joinCode: 'जॉइन कोड',
    copyCode: 'कॉपी',
    copied: 'कॉपी झाले',
    vargani: 'वर्गणी',
    javak: 'जावक',
    cash: 'रोख',
    upi: 'UPI',
    bank: 'बँक',
    saveEntry: 'नोंद जतन करा',
    sendWhatsApp: 'व्हॉट्सॲपवर पाठवा',
    downloadReceipt: 'पावती जतन करा',
    exportPdf: 'PDF अहवाल',
    exportCsv: 'Excel / CSV',
    shareSummary: 'हिशोब पोस्टर शेअर करा',
    publicLedger: 'सार्वजनिक हिशोब लिंक',
    language: 'भाषा',
    logout: 'बाहेर पडा',
  },
  hi: {
    appName: 'UtsavBook',
    tagline: 'मण्डल का हिसाब, सबके सामने।',
    home: 'होम',
    entries: 'एंट्रीज़',
    reports: 'रिपोर्ट',
    alerts: 'अलर्ट्स',
    mandal: 'मण्डल',
    thisUtsav: 'वर्तमान उत्सव',
    collected: 'कुल चंदा',
    spent: 'कुल खर्च',
    inHand: 'शेष राशि',
    netBalance: 'कुल शेष',
    addIncome: '+ चंदा (जमा)',
    addExpense: '− खर्च',
    addGoods: '+ सामग्री भेंट',
    recentTransactions: 'हाल के लेन-देन',
    viewAll: 'सभी देखें',
    all: 'सभी',
    income: 'जमा',
    expense: 'खर्च',
    goods: 'सामग्री',
    searchPlaceholder: 'नाम, फ्लैट, रसीद नं. खोजें...',
    byHead: 'मद के अनुसार',
    collectors: 'कार्यकर्ता',
    byMode: 'माध्यम से',
    filters: 'फ़िल्टर',
    order: 'क्रम',
    today: 'आज',
    last7Days: 'पिछले 7 दिन',
    last30Days: 'पिछले 30 दिन',
    thisMonth: 'इस महीने',
    fullUtsav: 'पूरा उत्सव',
    nothingPending: 'कुछ भी लंबित नहीं',
    nothingPendingSub: 'सभी खर्च स्वीकृति, नकद जमा और व्हाट्सएप रसीदें पूरी हैं।',
    receiptsLeft: 'रसीदें शेष',
    buyCredits: 'रसीद पैक खरीदें',
    joinCode: 'जॉइन कोड',
    copyCode: 'कॉपी',
    copied: 'कॉपी हुआ',
    vargani: 'चंदा',
    javak: 'खर्च',
    cash: 'नकद',
    upi: 'UPI',
    bank: 'बैंक',
    saveEntry: 'एंट्री सेव करें',
    sendWhatsApp: 'व्हाट्सएप पर भेजें',
    downloadReceipt: 'रसीद सेव करें',
    exportPdf: 'PDF रिपोर्ट',
    exportCsv: 'Excel / CSV',
    shareSummary: 'हिसाब पोस्टर शेयर करें',
    publicLedger: 'सार्वजनिक पारदर्शी पेज',
    language: 'भाषा',
    logout: 'लॉगआउट',
  },
};

export function t(lang: Language, key: string): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}

export function formatINR(amount: number, masked = false): string {
  if (masked) {
    return '₹****';
  }
  const abs = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('en-IN').format(abs);
  return amount < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one > 0 ? `${TENS[ten]} ${ONES[one]}` : TENS[ten];
}

function threeDigitsToWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (hundred > 0 && rest > 0) return `${ONES[hundred]} Hundred ${twoDigitsToWords(rest)}`;
  if (hundred > 0) return `${ONES[hundred]} Hundred`;
  return twoDigitsToWords(rest);
}

export function numberToIndianWords(amount: number): string {
  const num = Math.floor(Math.abs(amount));
  if (num === 0) return 'Zero rupees only';

  const parts: string[] = [];
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  if (crore > 0) parts.push(`${twoDigitsToWords(crore)} Crore`);
  if (lakh > 0) parts.push(`${twoDigitsToWords(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigitsToWords(thousand)} Thousand`);
  if (remainder > 0) parts.push(threeDigitsToWords(remainder));

  return `${parts.join(' ')} rupees only`;
}

export function formatDayHeader(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr.toUpperCase();
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  return `${day} ${month}`;
}

export function formatReceiptDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function normalizeWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return '';
  return `91${digits.slice(-10)}`;
}

export function normalizeIndianPhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return `91${digits.slice(-10)}`;
  return digits;
}

export function buildWhatsAppReceiptMessage(params: {
  donorName: string;
  mandalName: string;
  utsavName: string;
  amount: number;
  receiptNumber: string;
  verifyUrl: string;
  receiptImageUrl?: string;
  flatOrAddress?: string;
  language?: Language;
  paymentMode?: string;
  upiTransactionId?: string;
  type?: EntryType;
  goodsDescription?: string;
  quantity?: string;
  estimatedValue?: number;
  publicLedgerUrl?: string;
  forAttachedImage?: boolean;
}): string {
  const lang: Language = params.language || 'en';
  const isGoods = params.type === 'goods';
  const mandalTitle = params.mandalName || 'Mandal';
  const formattedAmt = new Intl.NumberFormat('en-IN').format(Math.round(params.amount || 0));
  const hasPublicImage = Boolean(
    params.receiptImageUrl && /^https?:\/\//i.test(params.receiptImageUrl)
  );
  const officialReceiptLink = hasPublicImage ? params.receiptImageUrl! : params.verifyUrl;
  const attachMode = Boolean(params.forAttachedImage);

  if (lang === 'mr') {
    const lines: string[] = [
      `🙏 *आपल्या अमूल्य सहकार्याबद्दल मनःपूर्वक धन्यवाद!* 🙏`,
      ``,
      `आदरणीय *${params.donorName}*,`,
    ];
    if (isGoods) {
      const itemLabel = params.goodsDescription || 'वस्तू दान';
      const qtyPart = params.quantity ? ` (${params.quantity})` : '';
      lines.push(
        `*${mandalTitle}* (${params.utsavName}) साठी आपण दिलेल्या *${itemLabel}${qtyPart}* या वस्तू दानाबद्दल मंडळातर्फे मनापासून आभार! आपल्या सहकार्यामुळे उत्सवाचा आनंद व उत्साह द्विगुणित होतो.`
      );
    } else {
      lines.push(
        `*${mandalTitle}* (${params.utsavName}) साठी आपण दिलेल्या *₹${formattedAmt}* वर्गणीबद्दल मंडळातर्फे मनापासून आभार! आपल्या सहकार्यामुळे उत्सवाचा आनंद व उत्साह द्विगुणित होतो.`
      );
    }
    lines.push(``);
    lines.push(
      `📄 अधिकृत पावती क्र.: *#${params.receiptNumber}*${attachMode ? ' (सोबत जोडली आहे)' : ''}`
    );
    if (!attachMode) {
      lines.push(`🔗 डिजिटल पावती पहा: ${officialReceiptLink}`);
    }
    lines.push(
      `आपणास व आपल्या कुटुंबीयांना सुख, समृद्धी व उत्तम आरोग्य लाभो हीच सदिच्छा! ✨`,
      ``,
      `आपला नम्र,`,
      `*${mandalTitle}*`
    );
    return lines.join('\n');
  }

  if (lang === 'hi') {
    const lines: string[] = [
      `🙏 *आपके उदार सहयोग के लिए हृदय से धन्यवाद!* 🙏`,
      ``,
      `आदरणीय *${params.donorName}*,`,
    ];
    if (isGoods) {
      const itemLabel = params.goodsDescription || 'सामग्री दान';
      const qtyPart = params.quantity ? ` (${params.quantity})` : '';
      lines.push(
        `*${mandalTitle}* (${params.utsavName}) के लिए आपके *${itemLabel}${qtyPart}* वस्तु दान हेतु मंडल परिवार की ओर से कोटि-कोटि धन्यवाद! आपका यह योगदान हमारे उत्सव को और अधिक भव्य व पावन बनाता है।`
      );
    } else {
      lines.push(
        `*${mandalTitle}* (${params.utsavName}) के लिए आपके *₹${formattedAmt}* के पावन सहयोग हेतु मंडल परिवार की ओर से कोटि-कोटि धन्यवाद! आपका यह योगदान हमारे उत्सव को और अधिक भव्य व पावन बनाता है।`
      );
    }
    lines.push(``);
    lines.push(
      `📄 आधिकारिक रसीद क्र.: *#${params.receiptNumber}*${attachMode ? ' (ऊपर संलग्न है)' : ''}`
    );
    if (!attachMode) {
      lines.push(`🔗 डिजिटल रसीद देखें: ${officialReceiptLink}`);
    }
    lines.push(
      `ईश्वर से प्रार्थना है कि आप और आपके परिवार पर सदैव सुख, शांति व समृद्धि की कृपा बनी रहे। ✨`,
      ``,
      `सादर धन्यवाद,`,
      `*${mandalTitle}*`
    );
    return lines.join('\n');
  }

  const lines: string[] = [
    `🙏 *Thank You for Your Generous Contribution!* 🙏`,
    ``,
    `Dear *${params.donorName}*,`,
  ];

  if (isGoods) {
    const itemLabel = params.goodsDescription || 'Vastu Daan';
    const qtyPart = params.quantity ? ` (${params.quantity})` : '';
    lines.push(
      `Heartfelt thanks for your thoughtful contribution of *${itemLabel}${qtyPart}* towards *${mandalTitle}* (${params.utsavName}). Your generosity brings warmth, devotion, and strength to our celebration!`
    );
  } else {
    lines.push(
      `Heartfelt thanks for your kind contribution of *₹${formattedAmt}* towards *${mandalTitle}* (${params.utsavName}). Your support brings joy, devotion, and strength to our celebration!`
    );
  }

  lines.push(``);
  lines.push(
    `📄 Official Receipt: *#${params.receiptNumber}*${attachMode ? ' (attached above)' : ''}`
  );
  if (!attachMode) {
    lines.push(`🔗 View Digital Receipt: ${officialReceiptLink}`);
  }
  lines.push(
    `May you and your family always be blessed with happiness, good health, and prosperity. ✨`,
    ``,
    `With gratitude,`,
    `*${mandalTitle}*`
  );

  return lines.join('\n');
}

export function buildWhatsAppReminderMessage(params: {
  residentName: string;
  flatNumber: string;
  wingName: string;
  mandalName: string;
  utsavName: string;
  publicUrl?: string;
}): string {
  return [
    `🙏 *Namaste ${params.residentName} (${params.wingName} - ${params.flatNumber}),*`,
    ``,
    `Friendly reminder from *${params.mandalName}* regarding *${params.utsavName}* Vargani / Community Contribution.`,
    `Our volunteer will be happy to collect via Cash or UPI and issue an instant digital receipt.`,
    ...(params.publicUrl ? [`View live transparent hisaab: ${params.publicUrl}`] : []),
    ``,
    `Thank you for your support! 🙏`,
  ].join('\n');
}

export function buildWhatsAppUrl(phone: string | undefined, message: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  const encoded = encodeURIComponent(message);
  return normalized ? `https://wa.me/${normalized}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function openWhatsAppShareUrl(url: string): void {
  if (typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function buildWhatsAppInviteUrl(mandalName: string, joinCode: string, inviteUrl: string): string {
  const msg = [
    `🙏 *${mandalName}* — UtsavBook Committee Invite`,
    `Join our digital hisaab & receipt book using code: *${joinCode}*`,
    `Tap to join: ${inviteUrl}`,
  ].join('\n');
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function buildWhatsAppSummaryText(params: {
  mandalName: string;
  utsavName: string;
  yearCycle: string;
  collected: number;
  spent: number;
  balance: number;
  publicUrl: string;
}): string {
  return [
    `📊 *${params.mandalName}* — ${params.utsavName} (${params.yearCycle}) Hisaab`,
    `✅ Total Collected: *${formatINR(params.collected)}*`,
    `🔻 Total Spent: *${formatINR(params.spent)}*`,
    `💰 Net Balance: *${formatINR(params.balance)}*`,
    ``,
    `Mandal ka hisaab, sabke saamne 👇`,
    params.publicUrl,
  ].join('\n');
}

export function downloadCsv(entries: LedgerEntry[], filename: string) {
  const headers = [
    'Date',
    'Type',
    'Receipt No',
    'Donor / Title',
    'Flat / Address',
    'Phone',
    'Head / Category',
    'Amount (INR)',
    'Payment Mode',
    'Collector / Paid By',
    'Approval Status',
    'WhatsApp Status',
    'Note',
  ];

  const escapeCell = (val: unknown) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = entries
    .filter((e) => !e.isVoided)
    .map((e) =>
      [
        e.entryDate,
        e.type.toUpperCase(),
        e.receiptNumber || '',
        e.titleOrDonorName,
        e.flatOrAddress || '',
        e.donorPhone || '',
        e.head,
        e.amount,
        e.paymentMode,
        e.createdByName,
        e.approvalStatus,
        e.whatsappStatus,
        e.note || e.goodsDescription || '',
      ]
        .map(escapeCell)
        .join(',')
    );

  const csvContent = '\uFEFF' + [headers.map(escapeCell).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function pdfSafe(text: unknown, maxLen = 80): string {
  const cleaned = String(text ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, maxLen);
}

function fmtPdfInr(amount: number): string {
  return `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount)}`;
}

export function exportHisabPdf(params: {
  mandal: Mandal;
  utsav: Utsav;
  entries: LedgerEntry[];
  dateLabel: string;
  members?: MandalMember[];
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const active = params.entries.filter((e) => !e.isVoided && e.approvalStatus === 'approved');
  const incomeEntries = active.filter((e) => e.type === 'income');
  const expenseEntries = active.filter((e) => e.type === 'expense');
  const goodsEntries = active.filter((e) => e.type === 'goods');

  const collected = incomeEntries.reduce((acc, e) => acc + e.amount, 0);
  const spent = expenseEntries.reduce((acc, e) => acc + e.amount, 0);
  const balance = collected - spent;

  // Header Banner (Notice Board Statement)
  doc.setFillColor(16, 125, 92);
  doc.rect(0, 0, pageWidth, 112, 'F');
  doc.setFillColor(224, 90, 71);
  doc.rect(0, 0, pageWidth, 8, 'F');

  doc.setTextColor(220, 252, 231);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OFFICIAL NOTICE BOARD HISAB STATEMENT', margin, 23);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(pdfSafe(params.mandal.name, 52) || 'UtsavBook Ledger', margin, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const subParts = [
    `${pdfSafe(params.utsav.name)} (${pdfSafe(params.utsav.yearCycle)})`,
    `Period: ${pdfSafe(params.dateLabel)}`,
    `Est. ${pdfSafe(params.mandal.estYear)}`,
  ].filter(Boolean);
  doc.text(subParts.join('  |  '), margin, 58);

  const addrLine = params.mandal.address
    ? `${pdfSafe(params.mandal.address, 60)}  |  Join Code: ${pdfSafe(params.mandal.joinCode)}`
    : `Join Code: ${pdfSafe(params.mandal.joinCode)}`;
  doc.text(addrLine, margin, 74);

  doc.setFontSize(8.5);
  doc.setTextColor(255, 237, 213);
  doc.text(
    `Generated on ${new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    margin,
    92
  );
  doc.text(
    `${incomeEntries.length} Receipts  |  ${expenseEntries.length} Expenses  |  ${goodsEntries.length} Goods`,
    pageWidth - margin,
    92,
    { align: 'right' }
  );

  // 3 Summary Cards
  const cardTop = 124;
  const cardGap = 12;
  const cardW = (contentWidth - cardGap * 2) / 3;

  const cards = [
    {
      label: 'TOTAL COLLECTED',
      val: fmtPdfInr(collected),
      bg: [240, 253, 244] as const,
      border: [187, 247, 208] as const,
      text: [22, 163, 74] as const,
    },
    {
      label: 'TOTAL SPENT',
      val: fmtPdfInr(spent),
      bg: [254, 242, 242] as const,
      border: [254, 202, 202] as const,
      text: [220, 38, 38] as const,
    },
    {
      label: 'NET BALANCE',
      val: fmtPdfInr(balance),
      bg: [255, 247, 237] as const,
      border: [254, 215, 170] as const,
      text: [154, 52, 18] as const,
    },
  ];

  cards.forEach((c, idx) => {
    const x = margin + idx * (cardW + cardGap);
    doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
    doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
    doc.roundedRect(x, cardTop, cardW, 56, 6, 6, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 91, 77);
    doc.text(c.label, x + 12, cardTop + 18);

    doc.setFontSize(14);
    doc.setTextColor(c.text[0], c.text[1], c.text[2]);
    doc.text(c.val, x + 12, cardTop + 42);
  });

  let y = 202;

  // Payment Mode Breakdown Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(67, 54, 44);
  doc.text('PAYMENT MODE SUMMARY', margin, y);
  y += 8;

  doc.setFillColor(245, 239, 230);
  doc.rect(margin, y, contentWidth, 20, 'F');
  doc.setFontSize(8);
  doc.setTextColor(92, 73, 56);
  doc.text('MODE', margin + 8, y + 13);
  doc.text('INFLOW', margin + 230, y + 13, { align: 'right' });
  doc.text('OUTFLOW', margin + 370, y + 13, { align: 'right' });
  doc.text('NET BALANCE', pageWidth - margin - 8, y + 13, { align: 'right' });
  y += 20;

  const modes = ['UPI', 'CASH', 'BANK'] as const;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  modes.forEach((mode) => {
    const inflow = incomeEntries
      .filter((e) => e.paymentMode === mode)
      .reduce((s, e) => s + e.amount, 0);
    const outflow = expenseEntries
      .filter((e) => e.paymentMode === mode)
      .reduce((s, e) => s + e.amount, 0);
    const net = inflow - outflow;

    doc.setDrawColor(239, 230, 218);
    doc.line(margin, y + 18, pageWidth - margin, y + 18);
    doc.setTextColor(31, 26, 23);
    doc.setFont('helvetica', 'bold');
    doc.text(mode, margin + 8, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 163, 74);
    doc.text(fmtPdfInr(inflow), margin + 230, y + 13, { align: 'right' });
    doc.setTextColor(220, 38, 38);
    doc.text(fmtPdfInr(outflow), margin + 370, y + 13, { align: 'right' });
    doc.setTextColor(31, 26, 23);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtPdfInr(net), pageWidth - margin - 8, y + 13, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 18;
  });

  y += 16;

  // Head-wise Summary Section (Top heads)
  const headMap = new Map<string, { type: 'income' | 'expense'; head: string; total: number; count: number }>();
  for (const e of active) {
    if (e.type === 'goods') continue;
    const key = `${e.type}::${e.head}`;
    const cur = headMap.get(key) || { type: e.type, head: e.head, total: 0, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    headMap.set(key, cur);
  }
  const headRows = Array.from(headMap.values()).sort((a, b) => b.total - a.total);

  const budgets = params.utsav.categoryBudgets || {};
  if (headRows.length > 0) {
    if (y > pageHeight - 130) {
      doc.addPage();
      y = 48;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(67, 54, 44);
    doc.text('CATEGORY / HEAD-WISE BREAKDOWN & BUDGET STATUS', margin, y);
    y += 8;

    doc.setFillColor(245, 239, 230);
    doc.rect(margin, y, contentWidth, 20, 'F');
    doc.setFontSize(8);
    doc.setTextColor(92, 73, 56);
    doc.text('CATEGORY / HEAD', margin + 8, y + 13);
    doc.text('TYPE', margin + 250, y + 13);
    doc.text('ENTRIES', margin + 320, y + 13, { align: 'right' });
    doc.text('BUDGET CAP', margin + 410, y + 13, { align: 'right' });
    doc.text('ACTUAL', pageWidth - margin - 8, y + 13, { align: 'right' });
    y += 20;

    doc.setFontSize(8.5);
    for (const hr of headRows) {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 48;
      }
      const cap = hr.type === 'expense' ? budgets[hr.head] : undefined;
      const capLabel = cap && cap > 0 ? `${fmtPdfInr(cap)} (${Math.round((hr.total / cap) * 100)}%)` : '-';
      doc.setDrawColor(239, 230, 218);
      doc.line(margin, y + 18, pageWidth - margin, y + 18);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 26, 23);
      doc.text(pdfSafe(hr.head, 36) || 'Other', margin + 8, y + 13);
      doc.setTextColor(hr.type === 'income' ? 22 : 220, hr.type === 'income' ? 163 : 38, hr.type === 'income' ? 74 : 38);
      doc.text(hr.type === 'income' ? 'Income' : 'Expense', margin + 250, y + 13);
      doc.setTextColor(67, 54, 44);
      doc.text(String(hr.count), margin + 320, y + 13, { align: 'right' });
      doc.text(capLabel, margin + 410, y + 13, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(fmtPdfInr(hr.total), pageWidth - margin - 8, y + 13, { align: 'right' });
      y += 18;
    }
    y += 18;
  }

  // Collector Settlement Summary
  if (params.members && params.members.length > 0) {
    if (y > pageHeight - 130) {
      doc.addPage();
      y = 48;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(67, 54, 44);
    doc.text('COLLECTOR CASH & SETTLEMENT SUMMARY', margin, y);
    y += 8;

    doc.setFillColor(245, 239, 230);
    doc.rect(margin, y, contentWidth, 20, 'F');
    doc.setFontSize(8);
    doc.setTextColor(92, 73, 56);
    doc.text('COLLECTOR', margin + 8, y + 13);
    doc.text('ROLE', margin + 205, y + 13);
    doc.text('CASH COLLECTED', margin + 335, y + 13, { align: 'right' });
    doc.text('CASH IN HAND', margin + 425, y + 13, { align: 'right' });
    doc.text('SETTLED', pageWidth - margin - 8, y + 13, { align: 'right' });
    y += 20;

    doc.setFontSize(8.5);
    for (const m of params.members) {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 48;
      }
      const cashCollected = incomeEntries
        .filter((e) => e.createdByUid === m.uid && e.paymentMode === 'CASH')
        .reduce((s, e) => s + e.amount, 0);
      const settled = Math.max(0, cashCollected - (m.cashInHand || 0));

      doc.setDrawColor(239, 230, 218);
      doc.line(margin, y + 18, pageWidth - margin, y + 18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 26, 23);
      doc.text(pdfSafe(m.name, 28) || 'Member', margin + 8, y + 13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(92, 73, 56);
      doc.text(m.role.toUpperCase(), margin + 205, y + 13);
      doc.text(fmtPdfInr(cashCollected), margin + 335, y + 13, { align: 'right' });
      doc.setTextColor((m.cashInHand || 0) > 0 ? 180 : 22, (m.cashInHand || 0) > 0 ? 83 : 163, (m.cashInHand || 0) > 0 ? 9 : 74);
      doc.text(fmtPdfInr(m.cashInHand || 0), margin + 425, y + 13, { align: 'right' });
      doc.setTextColor(22, 163, 74);
      doc.text(fmtPdfInr(settled), pageWidth - margin - 8, y + 13, { align: 'right' });
      y += 18;
    }
    y += 18;
  }

  // In-Kind Vastu Daan Summary if present
  if (goodsEntries.length > 0) {
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 48;
    }
    const estTotal = goodsEntries.reduce((s, e) => s + (e.estimatedValue || 0), 0);
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(margin, y, contentWidth, 28, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text(
      `IN-KIND / VASTU DAAN: ${goodsEntries.length} non-cash contributions logged${estTotal > 0 ? ` (Est. Total Value: ${fmtPdfInr(estTotal)} — excluded from Cash-in-Hand)` : ' (excluded from Cash-in-Hand)'}`,
      margin + 10,
      y + 17
    );
    y += 42;
  }

  // Itemized Ledger Table
  const drawLedgerHeader = (topY: number) => {
    doc.setFillColor(245, 239, 230);
    doc.rect(margin, topY, contentWidth, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(67, 54, 44);
    doc.text('DATE', margin + 8, topY + 14);
    doc.text('TYPE / REC', margin + 74, topY + 14);
    doc.text('DONOR / PARTICULARS', margin + 152, topY + 14);
    doc.text('HEAD / MODE', margin + 336, topY + 14);
    doc.text('AMOUNT', pageWidth - margin - 8, topY + 14, { align: 'right' });
    return topY + 22;
  };

  if (y > pageHeight - 100) {
    doc.addPage();
    y = 48;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(67, 54, 44);
  doc.text(`DETAILED LEDGER STATEMENT (${active.length} ENTRIES)`, margin, y);
  y += 8;
  y = drawLedgerHeader(y);

  if (active.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 91, 77);
    doc.text('No approved transactions recorded in this period.', margin + 8, y + 20);
  } else {
    active.forEach((entry, idx) => {
      if (y > pageHeight - 54) {
        doc.addPage();
        y = 42;
        y = drawLedgerHeader(y);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(252, 249, 244);
        doc.rect(margin, y, contentWidth, 20, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(67, 54, 44);
      doc.text(pdfSafe(entry.entryDate, 12), margin + 8, y + 13);
      doc.text(
        pdfSafe(entry.receiptNumber ? entry.receiptNumber : entry.type.toUpperCase(), 14),
        margin + 74,
        y + 13
      );

      const rawTitle = entry.titleOrDonorName + (entry.flatOrAddress ? ` (${entry.flatOrAddress})` : '');
      doc.setTextColor(31, 26, 23);
      doc.text(pdfSafe(rawTitle, 32) || 'Entry', margin + 152, y + 13);

      doc.setTextColor(92, 73, 56);
      doc.text(
        `${pdfSafe(entry.head, 18)} - ${pdfSafe(entry.paymentMode, 6)}`,
        margin + 336,
        y + 13
      );

      if (entry.type === 'income') doc.setTextColor(22, 163, 74);
      else if (entry.type === 'expense') doc.setTextColor(220, 38, 38);
      else doc.setTextColor(180, 83, 9);

      doc.setFont('helvetica', 'bold');
      const prefix = entry.type === 'income' ? '+' : entry.type === 'expense' ? '-' : '';
      const amtLabel =
        entry.type === 'goods'
          ? 'GOODS'
          : `${prefix}Rs.${new Intl.NumberFormat('en-IN').format(entry.amount)}`;
      doc.text(amtLabel, pageWidth - margin - 8, y + 13, { align: 'right' });

      doc.setDrawColor(239, 230, 218);
      doc.line(margin, y + 20, pageWidth - margin, y + 20);
      y += 20;
    });
  }

  // Official President & Treasurer Signature Blocks for Notice Board Display
  if (y > pageHeight - 115) {
    doc.addPage();
    y = 60;
  } else {
    y += 26;
  }

  const sigWidth = (contentWidth - 32) / 3;
  const sigLabels = ['Treasurer / Khajindar', 'President / Adhyaksha', 'Auditor / Committee'];
  sigLabels.forEach((label, i) => {
    const sx = margin + i * (sigWidth + 16);
    doc.setDrawColor(180, 170, 160);
    doc.line(sx, y + 34, sx + sigWidth, y + 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(67, 54, 44);
    doc.text(label, sx + sigWidth / 2, y + 48, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(138, 117, 98);
    doc.text('Signature & Stamp', sx + sigWidth / 2, y + 60, { align: 'center' });
  });

  // Page Footers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(239, 230, 218);
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(138, 117, 98);
    doc.text(
      'UtsavBook Audit Statement  |  Mandal ka hisaab, sabke saamne',
      margin,
      pageHeight - 20
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
  }

  const safeName = (params.mandal.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'mandalbook').replace(
    /^-|-$/g,
    ''
  );
  doc.save(`${safeName}-${params.utsav.yearCycle}-ledger.pdf`);
}

export async function compressImageFile(
  file: File,
  maxDim = 720,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
