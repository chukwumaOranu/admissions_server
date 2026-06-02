const PDFDocument = require('pdfkit');

const COLORS = {
  navy: '#1e3a5f',
  blue: '#2563eb',
  green: '#059669',
  ink: '#111827',
  muted: '#6b7280',
  line: '#dbe3ef',
  soft: '#f8fafc'
};

const renderWithVariables = (template, variables) => {
  let output = template || '';
  for (const [key, value] of Object.entries(variables || {})) {
    output = output.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value ?? ''));
  }
  return output;
};

const getDefaultAdmissionLetterText = () => `Dear {{student_name}},

Congratulations. You have been offered provisional admission into {{school_name}}.

Next Steps:
1. Login to your student portal with your credentials.
2. Complete profile and required documentation.
3. Pay applicable admission and screening fees.
4. Print your exam/admission card where applicable.

This offer remains provisional until all requirements are met and verified.

Admissions Office
{{school_name}}`;

const generateAdmissionLetterPDF = async ({ applicant, schoolSettings = {}, letterRef, issuedAt, template = null }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true });
  const chunks = [];

  return await new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);

    const schoolName = schoolSettings.school_name || 'School';
    const schoolAddress = schoolSettings.school_address || '';
    const schoolEmail = schoolSettings.school_email || '';
    const schoolPhone = schoolSettings.school_phone || '';
    const issuedDate = new Date(issuedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    doc.rect(0, 0, doc.page.width, 112).fill(COLORS.navy);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text(schoolName, 42, 28, {
      align: 'center',
      width: doc.page.width - 84
    });
    if (schoolAddress) {
      doc.font('Helvetica').fontSize(9).fillColor('#dbeafe').text(schoolAddress, 42, 58, {
        align: 'center',
        width: doc.page.width - 84
      });
    }
    const contactLine = [schoolPhone, schoolEmail].filter(Boolean).join(' | ');
    if (contactLine) {
      doc.fontSize(9).fillColor('#dbeafe').text(contactLine, 42, 75, {
        align: 'center',
        width: doc.page.width - 84
      });
    }

    doc.roundedRect(42, 136, doc.page.width - 84, 54, 8).fillAndStroke(COLORS.soft, COLORS.line);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(16).text('PROVISIONAL ADMISSION LETTER', 58, 153);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(`Reference: ${letterRef}`, 360, 149, { width: 160, align: 'right' });
    doc.text(`Issued: ${issuedDate}`, 360, 164, { width: 160, align: 'right' });

    const variables = {
      reference: letterRef,
      issued_date: issuedDate,
      student_name: `${applicant.first_name} ${applicant.last_name}`,
      first_name: applicant.first_name,
      last_name: applicant.last_name,
      application_number: applicant.application_number || applicant.id,
      student_email: applicant.email,
      school_name: schoolName,
      school_address: schoolAddress,
      school_phone: schoolPhone,
      school_email: schoolEmail
    };

    doc.y = 220;
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(11);

    doc.roundedRect(42, doc.y, doc.page.width - 84, 72, 8).stroke(COLORS.line);
    const infoTop = doc.y + 14;
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text('CANDIDATE', 58, infoTop);
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12).text(variables.student_name, 58, infoTop + 14);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(variables.student_email || '', 58, infoTop + 32);
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text('APPLICATION NUMBER', 360, infoTop);
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12).text(variables.application_number, 360, infoTop + 14, { width: 160, align: 'right' });

    doc.y += 104;

    const bodyTemplate = template?.text_body || getDefaultAdmissionLetterText();
    const renderedBody = renderWithVariables(bodyTemplate, variables);
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(11).text(renderedBody, 58, doc.y, {
      align: 'left',
      lineGap: 5,
      width: doc.page.width - 116
    });

    const footerY = doc.page.height - 118;
    doc.moveTo(42, footerY).lineTo(doc.page.width - 42, footerY).stroke(COLORS.line);
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10).text('Admissions Office', 58, footerY + 18);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(schoolName, 58, footerY + 34);
    doc.fillColor(COLORS.green).font('Helvetica-Bold').fontSize(9).text('Approved for release', 360, footerY + 18, {
      width: 160,
      align: 'right'
    });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(`Document Ref: ${letterRef}`, 360, footerY + 34, {
      width: 160,
      align: 'right'
    });

    doc.end();
  });
};

module.exports = {
  generateAdmissionLetterPDF
};
