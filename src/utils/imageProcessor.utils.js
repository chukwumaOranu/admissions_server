const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Process and optimize profile photo
 * - Resize to 300x300 (square)
 * - Compress to 80% quality
 * - Convert to JPEG
 * - Save to profiles directory
 */
const processProfilePhoto = async (inputPath, studentId) => {
  try {
    const filename = `STUDENT_${studentId}_${Date.now()}.jpg`;
    const outputPath = path.join('./uploads/profiles', filename);
    
    // Process image with Sharp
    await sharp(inputPath)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toFile(outputPath);
    
    // Delete temp file
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    
    // Return relative URL for database
    return `/uploads/profiles/${filename}`;
    
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

/**
 * Process passport photo for applications
 * - Resize to 400x500 (passport size)
 * - Compress to 85% quality
 * - Convert to JPEG
 */
const processPassportPhoto = async (inputPath, applicantId) => {
  try {
    const filename = `PASSPORT_${applicantId}_${Date.now()}.jpg`;
    const outputPath = path.join('./uploads/documents', filename);
    
    // Process image with Sharp (passport dimensions)
    await sharp(inputPath)
      .resize(400, 500, {
        fit: 'cover',
        position: 'top' // Focus on top for passport photos
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toFile(outputPath);
    
    // Delete temp file
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    
    // Return relative URL for database
    return `/uploads/documents/${filename}`;
    
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    throw new Error(`Passport photo processing failed: ${error.message}`);
  }
};

/**
 * Process document image (certificates, IDs, etc.)
 * - Resize to max 1200px width (maintain aspect ratio)
 * - Compress to 85% quality
 * - Convert to JPEG
 */
const processDocumentImage = async (inputPath, documentType, userId) => {
  try {
    const filename = `${documentType.toUpperCase()}_${userId}_${Date.now()}.jpg`;
    const outputPath = path.join('./uploads/documents', filename);
    
    // Process image with Sharp
    await sharp(inputPath)
      .resize(1200, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toFile(outputPath);
    
    // Delete temp file
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    
    // Return relative URL for database
    return `/uploads/documents/${filename}`;
    
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    throw new Error(`Document image processing failed: ${error.message}`);
  }
};

/**
 * Delete old photo file from server
 */
const deletePhotoFile = (photoUrl) => {
  try {
    if (!photoUrl) return;
    
    // Convert URL to file path
    const filePath = path.join('.', photoUrl);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old photo: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting photo: ${error.message}`);
    // Don't throw error, just log it
  }
};

/**
 * Get image metadata (dimensions, format, size)
 */
const getImageMetadata = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha
    };
  } catch (error) {
    throw new Error(`Failed to read image metadata: ${error.message}`);
  }
};

/**
 * Create thumbnail (small preview)
 */
const createThumbnail = async (inputPath, outputPath, size = 100) => {
  try {
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 70
      })
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Thumbnail creation failed: ${error.message}`);
  }
};

module.exports = {
  processProfilePhoto,
  processPassportPhoto,
  processDocumentImage,
  deletePhotoFile,
  getImageMetadata,
  createThumbnail
};
