const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

// =====================================================
// SIMPLIFIED EXAM CARD GENERATOR (PDF-ONLY)
// =====================================================

/**
 * Generate QR Code for exam card
 */
const generateQRCode = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Load and process profile image
 */
const loadProfileImage = async (profilePhotoPath) => {
  try {
    if (!profilePhotoPath) {
      return null;
    }

    // Remove the leading slash and 'uploads/' from profilePhotoPath if it exists
    let cleanPath = profilePhotoPath.startsWith('/') ? profilePhotoPath.slice(1) : profilePhotoPath;
    if (cleanPath.startsWith('uploads/')) {
      cleanPath = cleanPath.replace('uploads/', '');
    }
    const fullPath = path.join(__dirname, '../../uploads', cleanPath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      console.warn(`Profile image not found: ${fullPath}`);
      return null;
    }

    // Process image with Sharp
    const processedImage = await sharp(fullPath)
      .resize(150, 150, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    return processedImage;
  } catch (error) {
    console.error('Error loading profile image:', error);
    return null;
  }
};

/**
 * Generate exam card as PDF (primary method)
 */
const generateExamCardPDF = async (examData) => {
  try {
    const {
      studentName,
      applicationId,
      programName,
      examDate,
      examTime,
      examVenue,
      examDuration,
      profilePhoto,
      qrCodeData,
      schoolName,
      schoolContact
    } = examData;

    const schoolDisplayName = schoolName || 'DeepFlux Academy';
    const contactLine = [
      schoolContact?.address,
      schoolContact?.phone,
      schoolContact?.email,
      schoolContact?.website
    ].filter(Boolean).join('  |  ');
    const colors = {
      ink: '#172033',
      muted: '#64748b',
      line: '#d7dde8',
      softLine: '#edf1f7',
      panel: '#f8fafc',
      primary: '#123b63',
      primarySoft: '#e8f1fb',
      gold: '#c6a15b',
      red: '#b42318',
      redSoft: '#fee4e2',
      green: '#0f8a5f',
      greenSoft: '#e8f7ef'
    };

    const doc = new PDFDocument({
      size: 'A4',
      margin: 36
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      const field = (label, value, x, y, width) => {
        doc.fontSize(7.4).font('Helvetica-Bold').fillColor(colors.muted).text(label.toUpperCase(), x, y, { width });
        doc.fontSize(9.4).font('Helvetica').fillColor(colors.ink).text(value || 'N/A', x, y + 11, {
          width,
          height: 24,
          ellipsis: true
        });
      };

      const section = (title, x, y, width) => {
        doc.rect(x, y, width, 18).fill(colors.primarySoft);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.primary).text(title.toUpperCase(), x + 10, y + 5, {
          width: width - 20
        });
      };

      doc.rect(0, 0, pageWidth, 88).fill(colors.primary);
      doc.rect(0, 84, pageWidth, 4).fill(colors.gold);
      doc.fontSize(17).font('Helvetica-Bold').fillColor('#ffffff').text(schoolDisplayName.toUpperCase(), margin, 24, {
        width: 330,
        height: 22,
        ellipsis: true
      });
      doc.fontSize(8.3).font('Helvetica').fillColor('#dbe7f5').text(contactLine || 'Admissions Office', margin, 51, {
        width: 365,
        height: 22,
        ellipsis: true
      });
      doc.fontSize(17).font('Helvetica-Bold').fillColor('#ffffff').text('EXAMINATION CARD', 372, 24, {
        width: 187,
        align: 'right'
      });
      doc.fontSize(8.3).font('Helvetica').fillColor('#dbe7f5').text(`Generated ${new Date().toLocaleDateString('en-GB')}`, 372, 51, {
        width: 187,
        align: 'right'
      });

      doc.roundedRect(margin, 110, contentWidth, 86, 6).fillAndStroke('#ffffff', colors.line);
      doc.fontSize(7.8).font('Helvetica-Bold').fillColor(colors.muted).text('APPLICATION NO.', 56, 128);
      doc.fontSize(17).font('Helvetica-Bold').fillColor(colors.primary).text(applicationId || 'N/A', 56, 143, {
        width: 170,
        height: 22,
        ellipsis: true
      });
      field('Candidate', studentName, 244, 128, 138);
      field('Program', programName, 400, 128, 130);

      const photoX = 56;
      const photoY = 226;
      const photoW = 96;
      const photoH = 116;
      doc.roundedRect(photoX, photoY, photoW, photoH, 5).fillAndStroke(colors.panel, colors.line);
      if (profilePhoto) {
        try {
          doc.image(profilePhoto, photoX + 5, photoY + 5, {
            width: photoW - 10,
            height: photoH - 10,
            fit: [photoW - 10, photoH - 10],
            align: 'center',
            valign: 'center'
          });
        } catch (error) {
          console.warn('Could not add profile image to PDF:', error.message);
        }
      } else {
        doc.fontSize(8).font('Helvetica-Bold').fillColor(colors.muted).text('PASSPORT', photoX, photoY + 50, {
          width: photoW,
          align: 'center'
        });
        doc.fontSize(7).font('Helvetica').fillColor(colors.muted).text('PHOTO', photoX, photoY + 63, {
          width: photoW,
          align: 'center'
        });
      }

      doc.fontSize(18).font('Helvetica-Bold').fillColor(colors.ink).text(studentName || 'N/A', 174, 226, {
        width: 260,
        height: 26,
        ellipsis: true
      });
      doc.fontSize(9.5).font('Helvetica').fillColor(colors.muted).text(programName || 'N/A', 174, 254, {
        width: 260,
        height: 16,
        ellipsis: true
      });
      doc.moveTo(174, 284).lineTo(432, 284).strokeColor(colors.softLine).lineWidth(1).stroke();
      field('Exam', examData.exam_title || 'Entrance Examination', 174, 304, 150);
      field('Duration', `${examDuration || 120} minutes`, 344, 304, 90);

      if (qrCodeData) {
        try {
          const qrBase64 = qrCodeData.split(',')[1];
          const qrBuffer = Buffer.from(qrBase64, 'base64');
          doc.roundedRect(450, 222, 88, 120, 5).fillAndStroke('#ffffff', colors.line);
          doc.image(qrBuffer, 462, 233, { width: 64, height: 64 });
          doc.fontSize(7).font('Helvetica-Bold').fillColor(colors.primary).text('VERIFY', 450, 304, {
            width: 88,
            align: 'center'
          });
          doc.fontSize(6.5).font('Helvetica').fillColor(colors.muted).text('Scan card', 450, 317, {
            width: 88,
            align: 'center'
          });
        } catch (error) {
          console.warn('Could not add QR code to PDF:', error.message);
        }
      }

      const detailsY = 386;
      section('Examination Schedule', margin, detailsY, contentWidth);
      doc.roundedRect(margin, detailsY + 18, contentWidth, 132, 0).stroke(colors.line);
      field('Exam Date', examDate, 56, detailsY + 38, 110);
      field('Exam Time', examTime, 188, detailsY + 38, 92);
      field('Venue', examVenue, 302, detailsY + 38, 220);
      field('Application Number', applicationId, 56, detailsY + 86, 130);
      field('Candidate Name', studentName, 208, detailsY + 86, 150);
      field('Program', programName, 380, detailsY + 86, 140);

      const instructionY = 560;
      section('Candidate Instructions', margin, instructionY, contentWidth);
      doc.roundedRect(margin, instructionY + 18, contentWidth, 148, 0).stroke(colors.line);
      const instructions = [
        'Arrive at the exam venue at least 30 minutes before the scheduled time.',
        'Bring this exam card and a valid photo ID for verification.',
        'Phones, smart watches, calculators and study materials are not permitted unless authorized.',
        'Follow all instructions from invigilators and remain seated until dismissed.',
        'Any form of malpractice may lead to immediate disqualification.'
      ];
      doc.font('Helvetica').fontSize(8.8).fillColor(colors.ink).list(instructions, 58, instructionY + 38, {
        width: contentWidth - 44,
        height: 95,
        bulletRadius: 1.6,
        bulletIndent: 10,
        textIndent: 6,
        lineGap: 3
      });

      doc.roundedRect(margin, 732, contentWidth, 34, 5).fill(colors.redSoft);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(colors.red).text('IMPORTANT', 54, 742, { width: 70 });
      doc.fontSize(8).font('Helvetica').fillColor(colors.ink).text('This card is valid only for the candidate and exam schedule shown above. Altered cards are invalid.', 126, 742, {
        width: 390,
        height: 14,
        ellipsis: true
      });

      doc.moveTo(margin, 790).lineTo(margin + contentWidth, 790).strokeColor(colors.line).lineWidth(1).stroke();
      doc.fontSize(7.5).font('Helvetica').fillColor(colors.muted).text(`${schoolDisplayName} Admissions • System-generated exam card`, margin, 800, {
        width: contentWidth,
        height: 12,
        align: 'center'
      });

      doc.end();
    });

  } catch (error) {
    console.error('Error generating exam card PDF:', error);
    throw new Error('Failed to generate exam card PDF');
  }
};

/**
 * Generate exam card as JPEG using Sharp (alternative method)
 */
const generateExamCardImage = async (examData) => {
  // JPEG generation disabled - PDF only
  // Return a minimal placeholder image (1x1 pixel)
  const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  return placeholder;
};

/**
 * Generate complete exam card (PDF primary, JPEG fallback)
 */
const generateCompleteExamCard = async (applicantData, examData) => {
  try {
    const {
      first_name,
      last_name,
      application_id,
      application_number,
      profile_photo,
      passport_photo,
      student_profile_photo
    } = applicantData;

    const {
      exam_title,
      exam_date,
      exam_time,
      exam_venue,
      exam_duration
    } = examData;

    // Prepare exam card data
    const examCardData = {
      studentName: `${first_name} ${last_name}`,
      applicationId: application_number || application_id || `APP${applicantData.id}`,
      programName: examData.schema_display_name || examData.schema_name || 'General Program',
      examDate: new Date(exam_date).toLocaleDateString(),
      examTime: exam_time,
      examVenue: exam_venue,
      examDuration: exam_duration || 120,
      profilePhoto: null,
      qrCodeData: null,
      schoolName: examData.schoolName || 'DeepFlux Academy',
      schoolContact: examData.schoolContact || null
    };

    // Load profile photo
    const photoPath = passport_photo || profile_photo || student_profile_photo;
    if (photoPath) {
      examCardData.profilePhoto = await loadProfileImage(photoPath);
    }

    // Generate QR code
    const qrData = JSON.stringify({
      applicant_id: applicantData.id,
      application_id: examCardData.applicationId,
      exam_date: exam_date,
      exam_time: exam_time,
      generated_at: new Date().toISOString()
    });
    examCardData.qrCodeData = await generateQRCode(qrData);

    // Generate PDF (primary method)
    const pdfBuffer = await generateExamCardPDF(examCardData);
    
    // Generate JPEG (simplified fallback)
    const imageBuffer = await generateExamCardImage(examCardData);

    return {
      image: imageBuffer,
      pdf: pdfBuffer,
      qrCode: examCardData.qrCodeData,
      metadata: {
        applicant_id: applicantData.id,
        application_id: examCardData.applicationId,
        generated_at: new Date().toISOString(),
        format: 'both'
      }
    };

  } catch (error) {
    console.error('Error generating complete exam card:', error);
    throw new Error('Failed to generate exam card');
  }
};

module.exports = {
  generateQRCode,
  loadProfileImage,
  generateExamCardImage,
  generateExamCardPDF,
  generateCompleteExamCard
};
