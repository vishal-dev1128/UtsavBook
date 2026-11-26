export interface MinimalReceiptDrawPayload {
  mandalName: string;
  localName?: string;
  subText: string;
  utsavName: string;
  receiptNo: string;
  isTemplate: boolean;
  isGoods: boolean;
  isVoided: boolean;
  amountFormatted: string;
  statusLabel: string;
  utrLine?: string;
  wordsText?: string;
  goodsLabel?: string;
  goodsSubLabel?: string;
  donorName: string;
  flatOrAddress: string;
  category: string;
  createdByName: string;
  signatoryName: string;
}

export type MinimalCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function drawRoundedRect(
  ctx: MinimalCanvasContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapTextLines(
  ctx: MinimalCanvasContext,
  text: string,
  maxWidth: number,
  maxLines = 3
): string[] {
  const clean = text.trim();
  if (!clean) return [];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
        if (lines.length >= maxLines) break;
      }
      current = word;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines && words.length > 0) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last).width > maxWidth && last.length > 3) {
      last = `${last.slice(0, -2)}…`;
    }
    lines[maxLines - 1] = last;
  }
  return lines;
}

function truncateLine(ctx: MinimalCanvasContext, text: string, maxWidth: number): string {
  const clean = text.trim();
  if (!clean || ctx.measureText(clean).width <= maxWidth) return clean;
  let out = clean;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

export interface MinimalReceiptDimensions {
  width: number;
  height: number;
  pad: number;
  contentW: number;
  scale: number;
  nameLines: string[];
  localLines: string[];
  subLines: string[];
  wordsLines: string[];
  amountBoxHeight: number;
  hasUtr: boolean;
}

const FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export function measureMinimalReceiptLayout(
  mctx: MinimalCanvasContext,
  payload: MinimalReceiptDrawPayload
): MinimalReceiptDimensions {
  const width = 420;
  const pad = 26;
  const contentW = width - pad * 2;
  const scale = 2;

  mctx.font = `800 17px ${FONT_STACK}`;
  const nameLines = wrapTextLines(mctx, payload.mandalName || 'Mandal', contentW - 12, 2);

  mctx.font = `600 12px ${FONT_STACK}`;
  const localLines = payload.localName
    ? wrapTextLines(mctx, payload.localName, contentW - 16, 1)
    : [];

  mctx.font = `500 11px ${FONT_STACK}`;
  const subLines = wrapTextLines(mctx, payload.subText, contentW - 16, 2);

  let wordsLines: string[] = [];
  if (!payload.isTemplate && !payload.isGoods && payload.wordsText) {
    mctx.font = `600 11px ${FONT_STACK}`;
    wordsLines = wrapTextLines(mctx, payload.wordsText, contentW - 36, 2);
  }

  const hasUtr = !payload.isTemplate && !payload.isGoods && Boolean(payload.utrLine);

  let height = 24;
  height += 28; // top pill row
  height += 16; // gap
  height += 64; // logo
  height += 10;
  height += nameLines.length * 22;
  if (localLines.length) height += localLines.length * 16 + 2;
  height += subLines.length * 15 + 4;
  height += 14; // divider gap
  height += 12;

  const amountBoxHeight = payload.isTemplate
    ? 92
    : payload.isGoods
      ? 92
      : 82 + (hasUtr ? 18 : 0) + (wordsLines.length ? wordsLines.length * 15 + 10 : 0);
  height += amountBoxHeight;
  height += 22; // gap before 2x2 grid
  height += 96; // 2x2 donor details grid
  height += 18; // gap before footer divider
  height += 68; // verified badge + signature row
  height += 24; // bottom pad

  return {
    width,
    height,
    pad,
    contentW,
    scale,
    nameLines,
    localLines,
    subLines,
    wordsLines,
    amountBoxHeight,
    hasUtr,
  };
}

export function drawMinimalReceiptScene(
  ctx: MinimalCanvasContext,
  dims: MinimalReceiptDimensions,
  payload: MinimalReceiptDrawPayload,
  logoImg: CanvasImageSource | null,
  sigImg: CanvasImageSource | null
): void {
  const {
    width,
    height,
    pad,
    contentW,
    scale,
    nameLines,
    localLines,
    subLines,
    wordsLines,
    amountBoxHeight,
    hasUtr,
  } = dims;
  const { isTemplate, isGoods } = payload;

  ctx.scale(scale, scale);

  // Outer backdrop + card container
  ctx.fillStyle = '#FFFEFB';
  ctx.fillRect(0, 0, width, height);

  drawRoundedRect(ctx, 1, 1, width - 2, height - 2, 26);
  ctx.fillStyle = '#FFFEFB';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  let y = 24;

  // 1. Top Row: Official Pill + #ReceiptNo Badge
  const pillText = isTemplate
    ? 'OFFICIAL RECEIPT'
    : isGoods
      ? 'VASTU DAAN RECEIPT'
      : 'OFFICIAL E-RECEIPT';
  ctx.font = `800 10px ${FONT_STACK}`;
  const pillW = ctx.measureText(pillText).width + 30;
  drawRoundedRect(ctx, pad, y, pillW, 26, 13);
  ctx.fillStyle = isGoods ? '#FFFBEB' : '#ECFDF5';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = isGoods ? '#FDE68A' : '#A7F3D0';
  ctx.stroke();

  // Checkmark circle inside pill
  ctx.beginPath();
  ctx.arc(pad + 13, y + 13, 5.5, 0, Math.PI * 2);
  ctx.strokeStyle = isGoods ? '#B45309' : '#059669';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pad + 10.5, y + 13.2);
  ctx.lineTo(pad + 12.2, y + 15);
  ctx.lineTo(pad + 15.8, y + 11.2);
  ctx.stroke();

  ctx.fillStyle = isGoods ? '#B45309' : '#047857';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(pillText, pad + 22, y + 13.5);

  ctx.font = `800 11.5px ${MONO_STACK}`;
  const numW = Math.min(165, ctx.measureText(payload.receiptNo).width + 20);
  drawRoundedRect(ctx, width - pad - numW, y, numW, 26, 8);
  ctx.fillStyle = '#F1F5F9';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.textAlign = 'center';
  ctx.fillText(
    truncateLine(ctx, payload.receiptNo, numW - 12),
    width - pad - numW / 2,
    y + 13.5
  );

  y += 42;

  // 2. Centered Mandal Logo & Header
  const logoSize = 60;
  const logoX = (width - logoSize) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(width / 2, y + logoSize / 2, logoSize / 2 + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();
  ctx.restore();

  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, y + logoSize / 2, logoSize / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    try {
      ctx.drawImage(logoImg, logoX + 2, y + 2, logoSize - 4, logoSize - 4);
    } catch {
      ctx.fillStyle = '#EFF6FF';
      ctx.fillRect(logoX + 2, y + 2, logoSize - 4, logoSize - 4);
    }
    ctx.restore();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, y + logoSize / 2, logoSize / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#EFF6FF';
    ctx.fill();
    ctx.fillStyle = '#1D4ED8';
    ctx.font = `800 18px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      (payload.mandalName || 'UB').slice(0, 2).toUpperCase(),
      width / 2,
      y + logoSize / 2 + 1
    );
    ctx.restore();
  }

  y += logoSize + 12;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0F172A';
  ctx.font = `800 17px ${FONT_STACK}`;
  for (const line of nameLines) {
    ctx.fillText(line, width / 2, y);
    y += 22;
  }

  if (localLines.length) {
    ctx.fillStyle = '#1D4ED8';
    ctx.font = `600 12px ${FONT_STACK}`;
    for (const line of localLines) {
      ctx.fillText(line, width / 2, y);
      y += 16;
    }
    y += 2;
  }

  ctx.fillStyle = '#64748B';
  ctx.font = `500 11px ${FONT_STACK}`;
  for (const line of subLines) {
    ctx.fillText(line, width / 2, y);
    y += 15;
  }

  y += 14;

  // 3. Dashed Divider
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(width - pad, y);
  ctx.stroke();
  ctx.restore();

  y += 14;

  // 4. Amount Highlight Box
  drawRoundedRect(ctx, pad, y, contentW, amountBoxHeight, 16);
  const grad = ctx.createLinearGradient(0, y, 0, y + amountBoxHeight);
  grad.addColorStop(0, '#F8FAFC');
  grad.addColorStop(1, isGoods ? '#FFFBEB' : '#EFF6FF');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = isGoods ? '#FDE68A' : '#E2E8F0';
  ctx.stroke();

  let boxY = y + 14;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#94A3B8';
  ctx.font = `700 10px ${FONT_STACK}`;
  ctx.fillText(
    isGoods ? 'VASTU DAAN / IN-KIND CONTRIBUTION' : 'VARGANI / CONTRIBUTION RECEIVED',
    width / 2,
    boxY
  );
  boxY += 18;

  if (isTemplate) {
    ctx.fillStyle = '#0F172A';
    ctx.font = `800 24px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.fillText('₹', width / 2 - 66, boxY);

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 44, boxY + 24);
    ctx.lineTo(width / 2 + 72, boxY + 24);
    ctx.stroke();
    ctx.restore();

    boxY += 34;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.fillText('Mode: ☐ Cash · ☐ UPI   ·   Date: ___ / ___ / 20___', width / 2, boxY);
  } else if (isGoods) {
    ctx.fillStyle = '#92400E';
    ctx.font = `800 17px ${FONT_STACK}`;
    ctx.fillText(truncateLine(ctx, payload.goodsLabel || 'Vastu Daan', contentW - 28), width / 2, boxY);
    boxY += 26;
    ctx.fillStyle = '#B45309';
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.fillText(payload.goodsSubLabel || '', width / 2, boxY);
  } else {
    ctx.fillStyle = '#0F172A';
    ctx.font = `800 26px ${FONT_STACK}`;
    ctx.fillText(payload.amountFormatted, width / 2, boxY);
    boxY += 32;

    ctx.font = `700 11px ${FONT_STACK}`;
    const statusW = ctx.measureText(payload.statusLabel).width;
    ctx.beginPath();
    ctx.arc(width / 2 - statusW / 2 - 7, boxY + 6, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#10B981';
    ctx.fill();
    ctx.fillStyle = '#047857';
    ctx.fillText(payload.statusLabel, width / 2 + 3, boxY);
    boxY += 16;

    if (hasUtr && payload.utrLine) {
      ctx.fillStyle = '#475569';
      ctx.font = `600 10.5px ${MONO_STACK}`;
      ctx.fillText(truncateLine(ctx, payload.utrLine, contentW - 24), width / 2, boxY + 2);
      boxY += 18;
    }

    if (wordsLines.length) {
      ctx.fillStyle = '#64748B';
      ctx.font = `600 10.5px ${FONT_STACK}`;
      boxY += 6;
      for (const line of wordsLines) {
        ctx.fillText(line, width / 2, boxY);
        boxY += 15;
      }
    }
  }

  y += amountBoxHeight + 22;

  // 5. 2x2 Donor Details Grid
  const colHalf = contentW / 2 - 8;
  const drawGridField = (
    label: string,
    value: string,
    x: number,
    rowY: number,
    align: 'left' | 'right',
    isBold = false,
    blankLine = false
  ) => {
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#94A3B8';
    ctx.font = `700 10px ${FONT_STACK}`;
    ctx.fillText(label, x, rowY);

    if (blankLine) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      if (align === 'left') {
        ctx.moveTo(x, rowY + 26);
        ctx.lineTo(x + colHalf, rowY + 26);
      } else {
        ctx.moveTo(x - Math.min(colHalf, 110), rowY + 26);
        ctx.lineTo(x, rowY + 26);
      }
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = isBold ? '#0F172A' : '#334155';
      ctx.font = `${isBold ? '800' : '700'} 12px ${FONT_STACK}`;
      ctx.fillText(truncateLine(ctx, value, colHalf), x, rowY + 15);
    }
  };

  drawGridField('RECEIVED FROM', isTemplate ? '' : payload.donorName || 'Donor', pad, y, 'left', true, isTemplate);
  drawGridField('FLAT / WING', isTemplate ? '' : payload.flatOrAddress || '—', width - pad, y, 'right', false, isTemplate);
  drawGridField('UTSAV CYCLE', payload.utsavName, pad, y + 48, 'left', false, false);
  drawGridField('CATEGORY', isTemplate ? '' : payload.category || 'Vargani / Chanda', width - pad, y + 48, 'right', false, isTemplate);

  y += 98;

  // 6. Bottom Verified Stamp & Signature Divider
  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(width - pad, y);
  ctx.stroke();

  y += 14;

  // Left: Verified Circle Badge + Text
  ctx.beginPath();
  ctx.arc(pad + 19, y + 22, 19, 0, Math.PI * 2);
  ctx.fillStyle = '#ECFDF5';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#A7F3D0';
  ctx.stroke();

  // Shield glyph inside circle
  ctx.beginPath();
  ctx.moveTo(pad + 19, y + 13);
  ctx.lineTo(pad + 26, y + 16);
  ctx.lineTo(pad + 26, y + 22);
  ctx.quadraticCurveTo(pad + 26, y + 28, pad + 19, y + 31);
  ctx.quadraticCurveTo(pad + 12, y + 28, pad + 12, y + 22);
  ctx.lineTo(pad + 12, y + 16);
  ctx.closePath();
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1E293B';
  ctx.font = `800 11px ${FONT_STACK}`;
  ctx.fillText(isTemplate ? 'Official Mandal Receipt' : 'Digitally Verified', pad + 44, y + 9);

  ctx.fillStyle = '#94A3B8';
  ctx.font = `500 10px ${FONT_STACK}`;
  ctx.fillText(
    isTemplate
      ? 'Thank you for your contribution'
      : truncateLine(ctx, `By ${payload.createdByName || 'Treasurer'}`, 166),
    pad + 44,
    y + 25
  );

  // Right: Signature + Signatory Name
  const sigBoxW = 116;
  const sigX = width - pad - sigBoxW;
  if (sigImg) {
    try {
      const iw =
        'naturalWidth' in sigImg && sigImg.naturalWidth
          ? sigImg.naturalWidth
          : 'width' in sigImg
            ? Number(sigImg.width)
            : 120;
      const ih =
        'naturalHeight' in sigImg && sigImg.naturalHeight
          ? sigImg.naturalHeight
          : 'height' in sigImg
            ? Number(sigImg.height)
            : 40;
      const ratio = Math.min(sigBoxW / (iw || 120), 34 / (ih || 40));
      const drawW = (iw || 100) * ratio;
      const drawH = (ih || 36) * ratio;
      ctx.drawImage(sigImg, sigX + (sigBoxW - drawW) / 2, y + (34 - drawH), drawW, drawH);
    } catch {
      // Ignore tainted canvas signature
    }
  }

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sigX, y + 38);
  ctx.lineTo(sigX + sigBoxW, y + 38);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = `700 10.5px ${FONT_STACK}`;
  ctx.fillText(
    truncateLine(ctx, payload.signatoryName || 'Authorized Signatory', sigBoxW - 6),
    sigX + sigBoxW / 2,
    y + 43
  );

  // Voided diagonal watermark stamp if entry is voided
  if (!isTemplate && payload.isVoided) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-0.22);
    drawRoundedRect(ctx, -110, -24, 220, 48, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#DC2626';
    ctx.stroke();
    ctx.fillStyle = '#DC2626';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 18px ${FONT_STACK}`;
    ctx.fillText('VOID / CANCELLED', 0, 1);
    ctx.restore();
  }
}
