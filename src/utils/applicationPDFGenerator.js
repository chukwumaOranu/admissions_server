const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

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
  green: '#0f8a5f',
  greenSoft: '#e8f7ef',
  amber: '#a15c00',
  amberSoft: '#fff4dc',
  red: '#b42318',
  redSoft: '#fee4e2'
};

const clean = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const titleCase = (value) => clean(value, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) || 'N/A';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMoney = (amount, currency = 'NGN') => {
  const number = Number(amount || 0);
  const formatted = number.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(currency).toUpperCase() === 'NGN' ? `Naira (NGN) ${formatted}` : `${currency} ${formatted}`;
};

const statusStyle = (status) => {
  const normalized = clean(status, 'pending').toLowerCase();
  if (normalized === 'approved' || normalized === 'paid') return { color: COLORS.green, bg: COLORS.greenSoft };
  if (normalized === 'rejected' || normalized === 'failed') return { color: COLORS.red, bg: COLORS.redSoft };
  return { color: COLORS.amber, bg: COLORS.amberSoft };
};

const parseCustomData = (customData) => {
  if (!customData) return {};
  if (typeof customData !== 'string') return customData && typeof customData === 'object' ? customData : {};

  let parsed = customData.trim();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }

    if (parsed && typeof parsed === 'object') return parsed;
    if (typeof parsed !== 'string') return {};
  }

  return {};
};

const resolveLocalFile = (filePath) => {
  if (!filePath || /^https?:\/\//i.test(filePath)) return null;

  const normalized = String(filePath).replace(/^\/+/, '');
  const candidates = [
    path.resolve(__dirname, '../../', normalized),
    path.resolve(__dirname, '../../../', normalized)
  ];

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
};

/**
 * Generate application PDF
 * Creates a professional application document for student applications
 */
const generateApplicationPDF = async (applicationData, schoolData = {}) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE.margin,
      autoFirstPage: true,
      info: {
        Title: `Application - ${applicationData.application_number || applicationData.id}`,
        Author: schoolData.school_name || 'DeepFlux Academy',
        Subject: 'Student Application',
        Creator: 'Admission Portal System'
      }
    });

    // Collect PDF data
    const pdfChunks = [];
    doc.on('data', chunk => pdfChunks.push(chunk));
    
    const pdfPromise = new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(pdfChunks)));
    });

    const contentX = PAGE.margin;
    const contentW = PAGE.width - (PAGE.margin * 2);
    const applicationNumber = applicationData.application_number || `APP${applicationData.id}`;
    const schoolName = clean(schoolData.school_name, 'DeepFlux Academy');
    const contactLine = [
      schoolData.school_address,
      schoolData.school_phone,
      schoolData.school_email
    ].filter(Boolean).join('  |  ');

    const labelValue = (label, value, x, y, width) => {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.muted).text(label.toUpperCase(), x, y, { width });
      doc.fontSize(9.5).font('Helvetica').fillColor(COLORS.ink).text(clean(value), x, y + 11, {
        width,
        height: 24,
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
      doc.fontSize(8).font('Helvetica-Bold').fillColor(style.color).text(titleCase(text).toUpperCase(), x, y + 6, {
        width,
        align: 'center'
      });
    };

    doc.rect(0, 0, PAGE.width, 86).fill(COLORS.primary);
    doc.rect(0, 82, PAGE.width, 4).fill('#c6a15b');

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
      .text('APPLICATION SUMMARY', 378, 24, { width: 181, align: 'right' });

    doc.fontSize(8.5)
      .font('Helvetica')
      .fillColor('#dbe7f5')
      .text(`Generated ${formatDate(new Date())}`, 378, 51, { width: 181, align: 'right' });

    doc.roundedRect(contentX, 108, contentW, 82, 6).fillAndStroke('#ffffff', COLORS.line);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.muted).text('APPLICATION NO.', 56, 125);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.primary).text(applicationNumber, 56, 140, {
      width: 170,
      height: 24,
      ellipsis: true
    });
    labelValue('Submitted', formatDate(applicationData.created_at), 244, 126, 86);
    labelValue('Program', applicationData.schema_display_name || applicationData.schema_name, 344, 126, 120);
    badge(applicationData.status || 'pending', 464, 130, 70, statusStyle(applicationData.status));

    const photoX = 56;
    const photoY = 220;
    doc.roundedRect(photoX, photoY, 92, 108, 5).fillAndStroke(COLORS.panel, COLORS.line);
    const passportPath = resolveLocalFile(applicationData.passport_photo || applicationData.student_profile_photo);
    if (passportPath) {
      doc.image(passportPath, photoX + 5, photoY + 5, {
        width: 82,
        height: 98,
        fit: [82, 98],
        align: 'center',
        valign: 'center'
      });
    } else {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.muted).text('PASSPORT', photoX, photoY + 45, {
        width: 92,
        align: 'center'
      });
      doc.fontSize(7).font('Helvetica').fillColor(COLORS.muted).text('PHOTO', photoX, photoY + 58, {
        width: 92,
        align: 'center'
      });
    }

    doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.ink).text(clean(applicationData.applicant_name), 168, 220, {
      width: 370,
      height: 25,
      ellipsis: true
    });
    doc.fontSize(9.5).font('Helvetica').fillColor(COLORS.muted).text(clean(applicationData.applicant_email), 168, 247, {
      width: 250,
      height: 16,
      ellipsis: true
    });
    doc.moveTo(168, 274).lineTo(538, 274).strokeColor(COLORS.softLine).lineWidth(1).stroke();
    labelValue('Phone', applicationData.phone, 168, 290, 110);
    labelValue('Date of Birth', formatDate(applicationData.date_of_birth), 292, 290, 110);
    labelValue('Gender', titleCase(applicationData.gender), 416, 290, 90);

    const personalY = 360;
    sectionTitle('Personal Details', contentX, personalY, contentW);
    doc.roundedRect(contentX, personalY + 18, contentW, 112, 0).stroke(COLORS.line);
    labelValue('Full Name', applicationData.applicant_name, 56, personalY + 34, 150);
    labelValue('Email Address', applicationData.applicant_email, 224, personalY + 34, 150);
    labelValue('Nationality', titleCase(applicationData.nationality), 392, personalY + 34, 120);
    labelValue('Residential Address', applicationData.address, 56, personalY + 78, 240);
    labelValue('Emergency Contact', applicationData.emergency_contact_name, 314, personalY + 78, 105);
    labelValue('Emergency Phone', applicationData.emergency_contact_phone, 438, personalY + 78, 96);

    const academicY = 508;
    const leftW = 250;
    const rightX = 316;
    const rightW = 243;
    sectionTitle('Application Details', contentX, academicY, leftW);
    doc.roundedRect(contentX, academicY + 18, leftW, 116, 0).stroke(COLORS.line);
    labelValue('Program / Form', applicationData.schema_display_name || applicationData.schema_name, 56, academicY + 34, 210);
    labelValue('Application Fee', formatMoney(applicationData.application_fee, schoolData.currency || 'NGN'), 56, academicY + 78, 96);
    labelValue('Payment Status', titleCase(applicationData.payment_status || 'pending'), 172, academicY + 78, 92);

    sectionTitle('Exam / Review', rightX, academicY, rightW);
    doc.roundedRect(rightX, academicY + 18, rightW, 116, 0).stroke(COLORS.line);
    labelValue('Exam Title', applicationData.exam_title, rightX + 20, academicY + 34, 190);
    labelValue('Exam Date', formatDate(applicationData.exam_date), rightX + 20, academicY + 78, 78);
    labelValue('Exam Time', applicationData.exam_time, rightX + 116, academicY + 78, 78);

    const notesY = 666;
    sectionTitle('Additional Information', contentX, notesY, 336);
    doc.roundedRect(contentX, notesY + 18, 336, 78, 0).stroke(COLORS.line);
    const customData = parseCustomData(applicationData.custom_data);
    const extraItems = Object.entries(customData).slice(0, 4);
    const extraText = [
      applicationData.notes && `Notes: ${applicationData.notes}`,
      ...extraItems.map(([key, value]) => `${titleCase(key)}: ${clean(value)}`)
    ].filter(Boolean).join('\n') || 'No additional information supplied.';

    doc.fontSize(8.5).font('Helvetica').fillColor(COLORS.ink).text(extraText, 50, notesY + 32, {
      width: 308,
      height: 48,
      ellipsis: true
    });

    // QR Code for verification
    try {
      const qrData = JSON.stringify({
        application_id: applicationData.id,
        application_number: applicationData.application_number || `APP${applicationData.id}`,
        applicant_name: applicationData.applicant_name,
        status: applicationData.status,
        created_at: applicationData.created_at
      });

      const qrCodeBuffer = await QRCode.toBuffer(qrData, {
        width: 86,
        margin: 2,
        color: {
          dark: COLORS.primary,
          light: '#FFFFFF'
        }
      });

      doc.roundedRect(396, notesY, 140, 96, 6).fillAndStroke('#ffffff', COLORS.line);
      doc.image(qrCodeBuffer, 406, notesY + 8, { width: 62, height: 62 });
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor(COLORS.primary)
         .text('VERIFY RECORD', 478, notesY + 18, { width: 46, align: 'center' });
      doc.fontSize(6.8)
         .font('Helvetica')
         .fillColor(COLORS.muted)
         .text('Scan this code to confirm application details.', 478, notesY + 38, { width: 46, align: 'center' });
    } catch (qrError) {
      console.warn('Could not generate QR code:', qrError.message);
    }

    doc.moveTo(contentX, 770).lineTo(contentX + contentW, 770).strokeColor(COLORS.line).lineWidth(1).stroke();
    doc.fontSize(7.5)
       .font('Helvetica')
       .fillColor(COLORS.muted)
       .text('This application summary is system-generated and subject to review by the admissions committee.', contentX, 780, {
         width: contentW,
         height: 12,
         align: 'center'
       });

    // Finalize PDF
    doc.end();

    // Wait for PDF to be generated
    const pdfBuffer = await pdfPromise;

    return {
      pdf: pdfBuffer,
      metadata: {
        applicationId: applicationData.id,
        applicationNumber: applicationData.application_number || `APP${applicationData.id}`,
        applicantName: applicationData.applicant_name,
        status: applicationData.status,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    throw new Error(`Failed to generate application PDF: ${error.message}`);
  }
};

module.exports = {
  generateApplicationPDF
};
