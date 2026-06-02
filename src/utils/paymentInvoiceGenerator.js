const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 36
};

const COLORS = {
  ink: '#172033',
  muted: '#64748b',
  line: '#d7dde8',
  softLine: '#edf1f7',
  panel: '#f8fafc',
  primary: '#123b63',
  primarySoft: '#e8f1fb',
  gold: '#c6a15b',
  green: '#0f8a5f',
  greenSoft: '#e8f7ef',
  amber: '#a15c00',
  amberSoft: '#fff4dc',
  red: '#b42318',
  redSoft: '#fee4e2'
};

const clean = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const titleCase = (value) => clean(value, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) || 'N/A';

const formatDate = (value, withTime = false) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const options = withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleString('en-GB', options);
};

const formatMoney = (amount, currency = 'NGN') => {
  const number = Number(amount || 0);
  const formatted = number.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(currency).toUpperCase() === 'NGN' ? `Naira (NGN) ${formatted}` : `${currency} ${formatted}`;
};

const statusStyle = (status) => {
  const normalized = clean(status, 'pending').toLowerCase();
  if (['success', 'successful', 'paid', 'completed'].includes(normalized)) {
    return { label: 'Successful', color: COLORS.green, bg: COLORS.greenSoft };
  }
  if (['failed', 'cancelled', 'canceled'].includes(normalized)) {
    return { label: titleCase(normalized), color: COLORS.red, bg: COLORS.redSoft };
  }
  return { label: titleCase(normalized), color: COLORS.amber, bg: COLORS.amberSoft };
};

/**
 * Generate payment invoice PDF
 * Creates a polished one-page A4 receipt for successful payment transactions.
 */
const generatePaymentInvoice = async (paymentData, applicantData, schoolData = {}) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE.margin,
      autoFirstPage: true,
      info: {
        Title: `Payment Receipt - ${paymentData.transaction_reference}`,
        Author: schoolData.school_name || schoolData.name || 'DeepFlux Academy',
        Subject: 'Payment Receipt',
        Creator: 'Admission Portal System'
      }
    });

    const pdfChunks = [];
    doc.on('data', chunk => pdfChunks.push(chunk));

    const pdfPromise = new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(pdfChunks)));
    });

    const contentX = PAGE.margin;
    const contentW = PAGE.width - (PAGE.margin * 2);
    const schoolName = clean(schoolData.school_name || schoolData.name, 'DeepFlux Academy');
    const schoolAddress = schoolData.school_address || schoolData.address;
    const schoolPhone = schoolData.school_phone || schoolData.phone;
    const schoolEmail = schoolData.school_email || schoolData.email;
    const currency = schoolData.currency || paymentData.currency || 'NGN';
    const status = statusStyle(paymentData.payment_status || paymentData.status);
    const reference = clean(paymentData.transaction_reference || paymentData.reference);
    const applicantName = clean(
      applicantData.applicant_name || `${clean(applicantData.first_name, '')} ${clean(applicantData.last_name, '')}`.trim(),
      'Applicant'
    );
    const contactLine = [schoolAddress, schoolPhone, schoolEmail].filter(Boolean).join('  |  ');
    const amountText = formatMoney(paymentData.amount, currency);

    const labelValue = (label, value, x, y, width, height = 24) => {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.muted).text(label.toUpperCase(), x, y, { width });
      doc.fontSize(9.5).font('Helvetica').fillColor(COLORS.ink).text(clean(value), x, y + 11, {
        width,
        height,
        ellipsis: true
      });
    };

    const sectionTitle = (title, x, y, width) => {
      doc.rect(x, y, width, 18).fill(COLORS.primarySoft);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary).text(title.toUpperCase(), x + 10, y + 5, {
        width: width - 20
      });
    };

    const badge = (text, x, y, width, style) => {
      doc.roundedRect(x, y, width, 20, 4).fill(style.bg);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(style.color).text(text.toUpperCase(), x, y + 6, {
        width,
        align: 'center'
      });
    };

    doc.rect(0, 0, PAGE.width, 86).fill(COLORS.primary);
    doc.rect(0, 82, PAGE.width, 4).fill(COLORS.gold);

    doc.fontSize(17)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(schoolName.toUpperCase(), contentX, 24, { width: 330, height: 22, ellipsis: true });

    doc.fontSize(8.5)
      .font('Helvetica')
      .fillColor('#dbe7f5')
      .text(contactLine || 'Admissions Office', contentX, 50, { width: 360, height: 22, ellipsis: true });

    doc.fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('PAYMENT RECEIPT', 350, 24, { width: 209, align: 'right' });

    doc.fontSize(8.5)
      .font('Helvetica')
      .fillColor('#dbe7f5')
      .text(`Generated ${formatDate(new Date(), true)}`, 350, 51, { width: 209, align: 'right' });

    doc.roundedRect(contentX, 108, contentW, 92, 6).fillAndStroke('#ffffff', COLORS.line);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.muted).text('TRANSACTION REFERENCE', 56, 126);
    doc.fontSize(15).font('Helvetica-Bold').fillColor(COLORS.primary).text(reference, 56, 142, {
      width: 230,
      height: 22,
      ellipsis: true
    });
    labelValue('Receipt Date', formatDate(paymentData.created_at, true), 306, 126, 96);
    labelValue('Payment Method', titleCase(paymentData.payment_method || 'Card'), 414, 126, 70);
    badge(status.label, 484, 130, 62, status);
    doc.moveTo(56, 178).lineTo(539, 178).strokeColor(COLORS.softLine).lineWidth(1).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.muted).text('TOTAL PAID', 56, 184);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.green).text(amountText, 128, 178, {
      width: 250,
      height: 22,
      ellipsis: true
    });

    const billY = 232;
    sectionTitle('Student / Applicant', contentX, billY, contentW);
    doc.roundedRect(contentX, billY + 18, contentW, 96, 0).stroke(COLORS.line);
    labelValue('Full Name', applicantName, 56, billY + 36, 150);
    labelValue('Application No.', applicantData.application_number || applicantData.applicant_number, 224, billY + 36, 110);
    labelValue('Program / Form', applicantData.schema_display_name || applicantData.schema_name, 352, billY + 36, 170);
    labelValue('Email Address', applicantData.email || applicantData.applicant_email, 56, billY + 78, 190);
    labelValue('Phone Number', applicantData.phone, 264, billY + 78, 110);
    labelValue('Applicant ID', applicantData.id, 392, billY + 78, 82);

    const paymentY = 374;
    sectionTitle('Payment Details', contentX, paymentY, contentW);
    doc.rect(contentX, paymentY + 18, contentW, 28).fill(COLORS.panel).stroke(COLORS.line);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLORS.muted)
      .text('DESCRIPTION', 56, paymentY + 28, { width: 250 })
      .text('REFERENCE', 320, paymentY + 28, { width: 110 })
      .text('AMOUNT', 450, paymentY + 28, { width: 88, align: 'right' });

    doc.rect(contentX, paymentY + 46, contentW, 48).stroke(COLORS.line);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.ink)
      .text(clean(paymentData.description || 'Application Fee Payment'), 56, paymentY + 62, { width: 240, height: 18, ellipsis: true })
      .text(reference, 320, paymentY + 62, { width: 110, height: 18, ellipsis: true })
      .text(amountText, 408, paymentY + 62, { width: 130, align: 'right', height: 18, ellipsis: true });

    const infoY = 528;
    sectionTitle('Transaction Verification', contentX, infoY, 332);
    doc.roundedRect(contentX, infoY + 18, 332, 112, 0).stroke(COLORS.line);
    labelValue('Gateway', 'Paystack', 56, infoY + 36, 86);
    labelValue('Paystack Reference', paymentData.paystack_reference || paymentData.gateway_reference || reference, 160, infoY + 36, 188);
    labelValue('Status', status.label, 56, infoY + 78, 80);
    labelValue('Generated By', 'Admission Portal System', 160, infoY + 78, 188);

    try {
      const qrData = JSON.stringify({
        transaction_reference: reference,
        amount: paymentData.amount,
        currency,
        date: paymentData.created_at,
        status: paymentData.payment_status || paymentData.status
      });

      const qrCodeBuffer = await QRCode.toBuffer(qrData, {
        width: 104,
        margin: 1,
        color: {
          dark: COLORS.primary,
          light: '#FFFFFF'
        }
      });

      doc.roundedRect(420, infoY + 18, 119, 112, 4).fillAndStroke('#ffffff', COLORS.line);
      doc.image(qrCodeBuffer, 428, infoY + 26, { width: 104, height: 104 });
    } catch (qrError) {
      doc.roundedRect(420, infoY + 18, 119, 112, 4).fillAndStroke(COLORS.panel, COLORS.line);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.muted).text('QR UNAVAILABLE', 420, infoY + 66, {
        width: 119,
        align: 'center'
      });
    }

    const noteY = 724;
    doc.roundedRect(contentX, noteY, contentW, 58, 6).fillAndStroke(COLORS.panel, COLORS.line);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary).text('Important Notice', 56, noteY + 12);
    doc.fontSize(8.5).font('Helvetica').fillColor(COLORS.muted).text(
      'This receipt confirms that the payment above was recorded by the admission portal. Keep this document for your records and contact the admissions office for payment-related enquiries.',
      56,
      noteY + 28,
      { width: 482, height: 30, ellipsis: true }
    );

    doc.fontSize(8)
      .font('Helvetica')
      .fillColor(COLORS.muted)
      .text('This is a system-generated receipt and does not require a signature.', contentX, 806, {
        width: contentW,
        align: 'center'
      });

    doc.end();
    const pdfBuffer = await pdfPromise;

    return {
      pdf: pdfBuffer,
      metadata: {
        transactionReference: reference,
        amount: paymentData.amount,
        status: paymentData.payment_status || paymentData.status,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    throw new Error(`Failed to generate payment invoice: ${error.message}`);
  }
};

module.exports = {
  generatePaymentInvoice
};
