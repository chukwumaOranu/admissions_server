const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const QRCode = require('qrcode');
const { createCanvas, loadImage, registerFont } = require('canvas');
const PDFDocument = require('pdfkit');

// =====================================================
// EXAM CARD GENERATOR UTILITIES
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

    const fullPath = path.join(__dirname, '../uploads', profilePhotoPath);
    
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
 * Generate exam card as JPEG image
 */
const generateExamCardImage = async (examData) => {
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
      qrCodeData
    } = examData;

    // Create canvas
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);

    // Add border
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 760, 560);

    // Add header
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ADMISSION EXAMINATION CARD', 400, 80);

    // Add school name
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#34495e';
    ctx.fillText('DeepFlux Academy', 400, 110);

    // Add decorative line
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 130);
    ctx.lineTo(700, 130);
    ctx.stroke();

    // Add profile photo
    if (profilePhoto) {
      try {
        const img = await loadImage(profilePhoto);
        ctx.drawImage(img, 50, 180, 150, 150);
        
        // Add photo border
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 180, 150, 150);
      } catch (error) {
        console.warn('Could not load profile image:', error.message);
      }
    }

    // Add student information
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('CANDIDATE INFORMATION', 250, 200);

    ctx.font = '16px Arial';
    ctx.fillText(`Name: ${studentName}`, 250, 230);
    ctx.fillText(`Application ID: ${applicationId}`, 250, 260);
    ctx.fillText(`Program: ${programName}`, 250, 290);

    // Add exam details
    ctx.font = 'bold 18px Arial';
    ctx.fillText('EXAMINATION DETAILS', 250, 340);

    ctx.font = '16px Arial';
    ctx.fillText(`Date: ${examDate}`, 250, 370);
    ctx.fillText(`Time: ${examTime}`, 250, 400);
    ctx.fillText(`Venue: ${examVenue}`, 250, 430);
    ctx.fillText(`Duration: ${examDuration} minutes`, 250, 460);

    // Add QR Code
    if (qrCodeData) {
      try {
        const qrCodeImg = await loadImage(qrCodeData);
        ctx.drawImage(qrCodeImg, 600, 180, 150, 150);
        
        // Add QR code label
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Scan for verification', 675, 350);
      } catch (error) {
        console.warn('Could not load QR code:', error.message);
      }
    }

    // Add instructions
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('IMPORTANT INSTRUCTIONS', 400, 520);

    ctx.fillStyle = '#2c3e50';
    ctx.font = '12px Arial';
    ctx.fillText('• Arrive 30 minutes before exam time', 400, 540);
    ctx.fillText('• Bring valid ID and this exam card', 400, 555);
    ctx.fillText('• No electronic devices allowed', 400, 570);

    // Add footer
    ctx.fillStyle = '#7f8c8d';
    ctx.font = '10px Arial';
    ctx.fillText(`Generated on: ${new Date().toLocaleDateString()}`, 400, 590);

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
    return buffer;

  } catch (error) {
    console.error('Error generating exam card image:', error);
    throw new Error('Failed to generate exam card image');
  }
};

/**
 * Generate exam card as PDF
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
      qrCodeData
    } = examData;

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Collect PDF data
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#2c3e50')
         .text('ADMISSION EXAMINATION CARD', { align: 'center' });

      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#34495e')
         .text('DeepFlux Academy', { align: 'center' });

      // Add decorative line
      doc.moveTo(50, 120)
         .lineTo(550, 120)
         .stroke('#3498db', 2);

      // Add profile photo
      if (profilePhoto) {
        try {
          doc.image(profilePhoto, 50, 150, { width: 120, height: 120 });
        } catch (error) {
          console.warn('Could not add profile image to PDF:', error.message);
        }
      }

      // Add student information
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#2c3e50')
         .text('CANDIDATE INFORMATION', 200, 150);

      doc.fontSize(12)
         .font('Helvetica')
         .text(`Name: ${studentName}`, 200, 180);
      doc.text(`Application ID: ${applicationId}`, 200, 200);
      doc.text(`Program: ${programName}`, 200, 220);

      // Add exam details
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('EXAMINATION DETAILS', 200, 260);

      doc.fontSize(12)
         .font('Helvetica')
         .text(`Date: ${examDate}`, 200, 290);
      doc.text(`Time: ${examTime}`, 200, 310);
      doc.text(`Venue: ${examVenue}`, 200, 330);
      doc.text(`Duration: ${examDuration} minutes`, 200, 350);

      // Add QR Code
      if (qrCodeData) {
        try {
          // Convert data URL to buffer
          const base64Data = qrCodeData.split(',')[1];
          const qrBuffer = Buffer.from(base64Data, 'base64');
          doc.image(qrBuffer, 400, 150, { width: 100, height: 100 });
          
          doc.fontSize(10)
             .text('Scan for verification', 400, 260, { align: 'center' });
        } catch (error) {
          console.warn('Could not add QR code to PDF:', error.message);
        }
      }

      // Add instructions
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#e74c3c')
         .text('IMPORTANT INSTRUCTIONS', 50, 400, { align: 'center' });

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#2c3e50')
         .text('• Arrive 30 minutes before exam time', 50, 430, { align: 'center' });
      doc.text('• Bring valid ID and this exam card', 50, 450, { align: 'center' });
      doc.text('• No electronic devices allowed', 50, 470, { align: 'center' });

      // Add footer
      doc.fontSize(8)
         .fillColor('#7f8c8d')
         .text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 500, { align: 'center' });

      doc.end();
    });

  } catch (error) {
    console.error('Error generating exam card PDF:', error);
    throw new Error('Failed to generate exam card PDF');
  }
};

/**
 * Generate complete exam card (both image and PDF)
 */
const generateCompleteExamCard = async (applicantData, examData) => {
  try {
    const {
      first_name,
      last_name,
      application_id,
      profile_photo
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
      applicationId: application_id || `APP${applicantData.id}`,
      programName: examData.schema_display_name || examData.schema_name || 'General Program',
      examDate: new Date(exam_date).toLocaleDateString(),
      examTime: exam_time,
      examVenue: exam_venue,
      examDuration: exam_duration || 120,
      profilePhoto: null,
      qrCodeData: null
    };

    // Load profile photo
    if (profile_photo) {
      examCardData.profilePhoto = await loadProfileImage(profile_photo);
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

    // Generate both formats
    const [imageBuffer, pdfBuffer] = await Promise.all([
      generateExamCardImage(examCardData),
      generateExamCardPDF(examCardData)
    ]);

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
