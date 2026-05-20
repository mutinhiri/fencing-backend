import { Injectable, Logger } from '@nestjs/common';
import { QuoteCalculation } from '../quotes/calculation.engine';
// import { PricingTemplate } from '../templates/template.entity';
import { PricingTemplate } from 'src/templates/entities/template.entity';

export interface PdfQuoteData {
  quoteNumber: string;
  date: string;
  validUntil: string;
  client: {
    name: string;
    address: string;
    phone: string;
    email: string;
    projectSite: string;
  };
  metres: number;
  height: string;
  sqm?: number;
  sqmInfo?: { width: number; height: number; perimeter: number };
  calc: QuoteCalculation;
  template: PricingTemplate;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  buildHtml(data: PdfQuoteData): string {
    const { quoteNumber, date, validUntil, client, calc, template, metres, height, sqm, sqmInfo } = data;

    const materialRows = calc.materials
      .map(
        (m) => `
      <tr>
        <td>${m.name}</td>
        <td class="num">${m.qty % 1 === 0 ? m.qty : m.qty.toFixed(2)} ${m.unit}</td>
        <td class="num">$${m.unitPrice.toFixed(2)}</td>
        <td class="num amount">$${m.total.toFixed(2)}</td>
      </tr>`,
      )
      .join('');

    const vatRow =
      template.vatPercent > 0
        ? `<tr class="vat-row"><td colspan="3" class="num label">VAT (${template.vatPercent}%)</td><td class="num">$${calc.vat.toFixed(2)}</td></tr>`
        : '';

    const sqmNote = sqm && sqmInfo
      ? `<p class="sqm-note">📐 ${sqm}m² converted to approx. ${sqmInfo.width}m × ${sqmInfo.height}m rectangle (perimeter: ${sqmInfo.perimeter}m)</p>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fencing Quote ${quoteNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: white; padding: 40px; }
  
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid #2d6a4f; margin-bottom: 28px; }
  .logo-area h1 { font-size: 24px; color: #2d6a4f; font-weight: 700; letter-spacing: -0.5px; }
  .logo-area .tagline { font-size: 12px; color: #6b7280; margin-top: 3px; }
  .logo-area .contact-info { margin-top: 10px; font-size: 11.5px; color: #4b5563; line-height: 1.6; }
  
  .quote-meta { text-align: right; }
  .quote-meta .quote-label { font-size: 22px; font-weight: 700; color: #2d6a4f; letter-spacing: 2px; text-transform: uppercase; }
  .quote-meta table { margin-top: 10px; margin-left: auto; font-size: 12px; }
  .quote-meta td { padding: 2px 0 2px 16px; color: #4b5563; }
  .quote-meta td:first-child { color: #9ca3af; text-align: right; }
  .quote-meta td:last-child { font-weight: 600; color: #1a1a1a; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .info-box { background: #f8faf9; border: 1px solid #d1e7dd; border-radius: 8px; padding: 16px; }
  .info-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #2d6a4f; font-weight: 600; margin-bottom: 10px; }
  .info-box p { font-size: 12.5px; line-height: 1.7; color: #374151; }
  .info-box p strong { color: #1a1a1a; }

  .scope-bar { background: #f0f9f4; border: 1px solid #bbddc9; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .scope-bar h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #2d6a4f; font-weight: 600; margin-bottom: 12px; }
  .scope-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; text-align: center; }
  .scope-item .val { font-size: 17px; font-weight: 700; color: #2d6a4f; }
  .scope-item .lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }

  .sqm-note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 14px; font-size: 12px; color: #1e40af; margin-bottom: 16px; }

  table.items { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  table.items thead { background: #2d6a4f; color: white; }
  table.items thead th { padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.3px; }
  table.items thead th.num { text-align: right; }
  table.items tbody tr { border-bottom: 1px solid #f3f4f6; }
  table.items tbody tr:nth-child(even) { background: #fafafa; }
  table.items tbody td { padding: 9px 14px; font-size: 12.5px; }
  table.items tbody td.num { text-align: right; color: #4b5563; }
  table.items tbody td.amount { font-weight: 500; color: #1a1a1a; }
  
  .totals-section { margin-top: 0; }
  .totals-section table { width: 100%; border-collapse: collapse; }
  .totals-section tr.subtotal td { border-top: 2px solid #e5e7eb; padding: 8px 14px; font-size: 13px; }
  .totals-section tr.vat-row td { padding: 6px 14px; color: #6b7280; font-size: 12px; }
  .totals-section tr.grand td { background: #2d6a4f; color: white; padding: 12px 14px; font-size: 15px; font-weight: 700; }
  .num { text-align: right; }
  .label { text-align: right; }

  .terms { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin-top: 24px; font-size: 12px; color: #92400e; line-height: 1.6; }
  .terms strong { color: #78350f; }

  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }

  @media print {
    body { padding: 20px; }
    .header { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="logo-area">
    <h1>${template.companyName}</h1>
    <div class="tagline">Professional Fencing Solutions</div>
    <div class="contact-info">
      ${template.companyAddress}<br>
      Tel: ${template.companyPhone} &nbsp;|&nbsp; Email: ${template.companyEmail}
    </div>
  </div>
  <div class="quote-meta">
    <div class="quote-label">Quotation</div>
    <table>
      <tr><td>Quote No</td><td>${quoteNumber}</td></tr>
      <tr><td>Date</td><td>${date}</td></tr>
      <tr><td>Valid Until</td><td>${validUntil}</td></tr>
    </table>
  </div>
</div>

<div class="two-col">
  <div class="info-box">
    <h3>Bill To</h3>
    <p>
      <strong>${client.name || '—'}</strong><br>
      ${client.address || ''}<br>
      ${client.phone ? 'Tel: ' + client.phone : ''}<br>
      ${client.email || ''}
    </p>
  </div>
  <div class="info-box">
    <h3>Project Details</h3>
    <p>
      <strong>Location:</strong> ${client.projectSite || '—'}<br>
      <strong>Fence Height:</strong> ${height}m<br>
      ${sqm ? `<strong>Stand Area:</strong> ${sqm}m²<br>` : ''}
      <strong>Total Length:</strong> ${metres}m<br>
      <strong>Segments:</strong> ${calc.posts.segments} (max gap: ${calc.posts.segmentLength}m)
    </p>
  </div>
</div>

<div class="scope-bar">
  <h3>Materials Summary</h3>
  <div class="scope-grid">
    <div class="scope-item"><div class="val">${metres}m</div><div class="lbl">Total length</div></div>
    <div class="scope-item"><div class="val">${calc.posts.totalRoundPosts}</div><div class="lbl">Round posts</div></div>
    <div class="scope-item"><div class="val">${calc.posts.standardPoles}</div><div class="lbl">Std poles</div></div>
    <div class="scope-item"><div class="val">${calc.supportingPosts}</div><div class="lbl">Support posts</div></div>
    <div class="scope-item"><div class="val">${calc.cementBags}</div><div class="lbl">Cement bags</div></div>
    <div class="scope-item"><div class="val">${calc.strainWireMetres}m</div><div class="lbl">Strain wire</div></div>
    <div class="scope-item"><div class="val">${calc.tyingWireKg}kg</div><div class="lbl">Tying wire</div></div>
    <div class="scope-item"><div class="val">$${calc.grand.toFixed(0)}</div><div class="lbl">Total</div></div>
  </div>
</div>

${sqmNote}

<table class="items">
  <thead>
    <tr>
      <th style="width:42%">Description</th>
      <th class="num" style="width:20%">Quantity</th>
      <th class="num" style="width:18%">Unit Price</th>
      <th class="num" style="width:20%">Amount (USD)</th>
    </tr>
  </thead>
  <tbody>${materialRows}</tbody>
</table>

<div class="totals-section">
  <table>
    <tr class="subtotal">
      <td colspan="3" class="num label" style="color:#4b5563;">Subtotal</td>
      <td class="num" style="font-weight:600;">$${calc.subtotal.toFixed(2)}</td>
    </tr>
    ${vatRow}
    <tr class="grand">
      <td colspan="3" class="num" style="border-radius: 0 0 0 8px;">TOTAL (USD)</td>
      <td class="num" style="border-radius: 0 0 8px 0;">$${calc.grand.toFixed(2)}</td>
    </tr>
  </table>
</div>

<div class="terms">
  <strong>Terms & Conditions:</strong> This quotation is valid for ${template.quoteValidity} days from the date of issue.
  A 50% deposit is required to confirm the order and procure materials. The balance is due upon completion.
  All prices are in United States Dollars (USD). Any variation in scope will be quoted separately.
  Materials remain the property of ${template.companyName} until full payment is received.
</div>

<div class="footer">
  Thank you for considering ${template.companyName} &nbsp;·&nbsp; 
  ${template.companyPhone} &nbsp;·&nbsp; ${template.companyEmail}
</div>

</body>
</html>`;
  }

  async generatePdfBuffer(data: PdfQuoteData): Promise<Buffer> {
    try {
      // Try to use puppeteer if available
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      const html = this.buildHtml(data);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        printBackground: true,
      });
      await browser.close();
      return Buffer.from(pdf);
    } catch (err) {
      this.logger.warn('Puppeteer not available, returning HTML buffer: ' + err.message);
      // Fallback: return HTML as buffer (frontend can open as print-ready page)
      return Buffer.from(this.buildHtml(data), 'utf-8');
    }
  }
}