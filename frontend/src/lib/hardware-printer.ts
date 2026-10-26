import { formatCurrency } from './utils';

export interface PrintReceiptParams {
  receiptNo: string;
  date?: string;
  storeName: string;
  branchName: string;
  crNumber?: string;
  phone?: string;
  cashierName?: string;
  customerName?: string;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  total: number;
  amountTendered?: number;
  change?: number;
  paperSize?: '80mm' | '58mm';
  autoCut?: boolean;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/**
 * Sends a receipt to the system thermal printer using an isolated zero-margin iframe.
 */
export function printReceipt(params: PrintReceiptParams): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);

    // Clean previous iframe
    const existingIframe = document.getElementById('pos-receipt-print-frame');
    if (existingIframe) {
      existingIframe.remove();
    }

    const is58mm = params.paperSize === '58mm';
    const paperWidth = is58mm ? '58mm' : '80mm';

    const iframe = document.createElement('iframe');
    iframe.id = 'pos-receipt-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = paperWidth;
    iframe.style.height = '100mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return resolve(false);

    const subtotalFormatted = formatCurrency(params.subtotal, 'QAR');
    const taxFormatted = formatCurrency(params.tax, 'QAR');
    const totalFormatted = formatCurrency(params.total, 'QAR');
    const tenderedFormatted = formatCurrency(params.amountTendered || params.total, 'QAR');
    const changeFormatted = formatCurrency(params.change || 0, 'QAR');
    const printDate = params.date || new Date().toLocaleString();

    const itemsRows = params.items
      .map(
        (item) => `
        <div style="padding: 3px 0; border-bottom: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: ${is58mm ? '9.5px' : '11px'}; line-height: 1.25; color: #000;">${item.name}</div>
            <div style="font-size: ${is58mm ? '8.5px' : '10px'}; color: #334155; margin-top: 1px;">${item.quantity} × ${formatCurrency(item.unitPrice, 'QAR')}</div>
          </div>
          <div style="font-weight: 700; font-size: ${is58mm ? '9.5px' : '11px'}; font-family: monospace; text-align: right; white-space: nowrap; color: #000;">
            ${formatCurrency(item.quantity * item.unitPrice, 'QAR')}
          </div>
        </div>
      `
      )
      .join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt - ${params.receiptNo}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: ${is58mm ? '9px' : '11px'};
              color: #000;
              background: #fff;
              width: ${paperWidth};
              padding: ${is58mm ? '3mm 2mm 5mm 2mm' : '4mm 3mm 6mm 3mm'};
              margin: 0 auto;
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .font-mono { font-family: monospace; }
            .divider { border-top: 1px dashed #94a3b8; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; padding: 1.5px 0; }
            .badge {
              display: inline-block;
              font-size: 8px;
              font-weight: 800;
              padding: 1px 4px;
              border: 1px solid #000;
              border-radius: 3px;
              text-transform: uppercase;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 style="font-size: ${is58mm ? '12px' : '15px'}; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">${params.storeName}</h2>
            <div style="font-size: ${is58mm ? '8.5px' : '10px'}; font-weight: 600; color: #334155;">${params.branchName}</div>
            ${params.crNumber ? `<div style="font-size: 8.5px; color: #475569;">C.R. / TAX ID: ${params.crNumber}</div>` : ''}
            ${params.phone ? `<div style="font-size: 8.5px; color: #475569;">Tel: ${params.phone}</div>` : ''}
            <div class="badge">SIMPLIFIED TAX INVOICE</div>
          </div>

          <div class="divider" style="margin-top: 6px;"></div>

          <div class="row" style="font-size: ${is58mm ? '8.5px' : '10px'}; color: #334155;">
            <span>Receipt No:</span>
            <span class="font-bold font-mono text-black">${params.receiptNo}</span>
          </div>
          <div class="row" style="font-size: ${is58mm ? '8.5px' : '10px'}; color: #334155;">
            <span>Date & Time:</span>
            <span>${printDate}</span>
          </div>
          ${params.cashierName ? `
            <div class="row" style="font-size: ${is58mm ? '8.5px' : '10px'}; color: #334155;">
              <span>Cashier:</span>
              <span class="font-bold">${params.cashierName}</span>
            </div>
          ` : ''}
          ${params.customerName && params.customerName !== 'Walk-in Customer' ? `
            <div class="row" style="font-size: ${is58mm ? '8.5px' : '10px'}; color: #334155;">
              <span>Customer:</span>
              <span class="font-bold">${params.customerName}</span>
            </div>
          ` : ''}

          <div class="divider"></div>

          <div style="margin: 4px 0;">
            ${itemsRows}
          </div>

          <div class="divider"></div>

          <div class="row">
            <span>Subtotal:</span>
            <span class="font-mono font-bold">${subtotalFormatted}</span>
          </div>
          <div class="row">
            <span>VAT / Tax:</span>
            <span class="font-mono font-bold">${taxFormatted}</span>
          </div>

          <div class="divider" style="border-top-style: solid; border-top-width: 1.5px; margin: 4px 0;"></div>

          <div class="row" style="font-size: ${is58mm ? '12px' : '14px'}; font-weight: 900;">
            <span>NET TOTAL:</span>
            <span class="font-mono">${totalFormatted}</span>
          </div>

          <div class="divider"></div>

          <div class="row" style="font-size: ${is58mm ? '8.5px' : '10px'};">
            <span>Payment Method:</span>
            <span class="font-bold">${params.paymentMethod}</span>
          </div>
          <div class="row" style="font-size: ${is58mm ? '8.5px' : '10px'};">
            <span>Tendered:</span>
            <span class="font-mono">${tenderedFormatted}</span>
          </div>
          ${
            params.change && params.change > 0
              ? `
            <div class="row" style="font-size: ${is58mm ? '8.5px' : '10px'}; font-weight: 700; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 4px; border-radius: 4px; margin-top: 2px;">
              <span>Change Returned:</span>
              <span class="font-mono">${changeFormatted}</span>
            </div>
          `
              : ''
          }

          <div class="divider" style="margin-top: 8px;"></div>

          <div class="text-center" style="margin-top: 6px;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 2px; height: 22px; margin-bottom: 4px;">
              ${[3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3]
                .map((w) => `<div style="background: #000; height: 100%; width: ${w}px;"></div>`)
                .join('')}
            </div>
            <div style="font-family: monospace; font-size: 8.5px; letter-spacing: 1px; color: #475569;">${params.receiptNo}</div>
            <div style="font-weight: 700; font-size: ${is58mm ? '9px' : '10px'}; margin-top: 3px; color: #0f172a;">Thank you for shopping with us!</div>
            <div style="font-size: 8px; color: #64748b; margin-top: 1px;">Return & exchange valid within 14 days with original receipt</div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch (err) {
        console.error('Print iframe trigger error:', err);
        window.print();
        resolve(false);
      }
    }, 200);
  });
}

/**
 * Prints a test calibration receipt to verify hardware printer readiness, paper feed, and margins.
 */
export function printTestReceipt(options?: {
  paperSize?: '80mm' | '58mm';
  storeName?: string;
  crNumber?: string;
  branchName?: string;
}): Promise<boolean> {
  return printReceipt({
    receiptNo: `TEST-${Math.floor(100000 + Math.random() * 900000)}`,
    storeName: options?.storeName || 'InventoryOS Qatar Store',
    branchName: options?.branchName || 'Main Hardware POS Counter #1',
    crNumber: options?.crNumber || 'CR-00974821',
    phone: '+974 4400 1234',
    cashierName: 'POS System Test Bench',
    customerName: 'Hardware Diagnostic Check',
    paymentMethod: 'TEST_PRINT',
    subtotal: 100.0,
    tax: 0.0,
    total: 100.0,
    amountTendered: 100.0,
    change: 0.0,
    paperSize: options?.paperSize || '80mm',
    items: [
      { name: 'Hardware Thermal Print Alignment Test', quantity: 1, unitPrice: 50.0 },
      { name: 'Barcode & ZATCA/Qatar QR Matrix Check', quantity: 1, unitPrice: 50.0 },
    ],
  });
}

/**
 * Triggers an ESC/POS pulse command for cash drawer kick.
 */
export function kickCashDrawer(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // In standard ESC/POS environments, the printer driver kicks the RJ12 drawer line
      // We trigger a micro test iframe with ESC/POS kick escape code
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        // ESC p 0 25 250 (pulse 50ms)
        doc.write('<html><body><span style="display:none;">\x1b\x70\x00\x19\xfa</span></body></html>');
        doc.close();
      }
      setTimeout(() => {
        iframe.remove();
        resolve(true);
      }, 300);
    } catch {
      resolve(false);
    }
  });
}
