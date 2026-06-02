const {
  generateExamCardNumber,
  createExamCard,
  findExamCardById,
  findExamCardByCardNumber,
  findExamCardByApplicant,
  findAllExamCards,
  markExamCardAsPrinted,
  updateExamCardFiles,
  getExamCardStats,
  findExamCardsByEntryDate
} = require('../models/payment-exam.model');

// =====================================================
// EXAM CARD CONTROLLER FUNCTIONS
// =====================================================

// Create new exam card
const createExamCardController = async (req, res) => {
  try {
    const {
      applicant_id,
      entry_date_id,
      qr_code_data,
      qr_code_image,
      card_image,
      card_pdf
    } = req.body;

    // Validate required fields
    if (!applicant_id || !entry_date_id) {
      return res.status(400).json({
        success: false,
        message: 'Applicant ID and entry date ID are required'
      });
    }

    // Create exam card
    const result = await createExamCard({
      applicant_id,
      entry_date_id,
      qr_code_data,
      qr_code_image,
      card_image,
      card_pdf
    });

    res.status(201).json({
      success: true,
      message: 'Exam card created successfully',
      data: {
        id: result.id,
        card_number: result.card_number
      }
    });

  } catch (error) {
    console.error('Error creating exam card:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all exam cards with pagination and filters
const getAllExamCardsController = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      entry_date_id = null,
      is_printed = null
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      entry_date_id,
      is_printed: is_printed !== null ? is_printed === 'true' : null
    };

    console.log('Exam cards query options:', options);
    const result = await findAllExamCards(options);

    res.status(200).json({
      success: true,
      message: 'Exam cards retrieved successfully',
      data: result.examCards,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error fetching exam cards:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get exam card by ID
const getExamCardByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const examCard = await findExamCardById(id);
    if (!examCard) {
      return res.status(404).json({
        success: false,
        message: 'Exam card not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exam card retrieved successfully',
      data: examCard
    });

  } catch (error) {
    console.error('Error fetching exam card:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get exam card by card number
const getExamCardByCardNumberController = async (req, res) => {
  try {
    const { cardNumber } = req.params;

    const examCard = await findExamCardByCardNumber(cardNumber);
    if (!examCard) {
      return res.status(404).json({
        success: false,
        message: 'Exam card not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exam card retrieved successfully',
      data: examCard
    });

  } catch (error) {
    console.error('Error fetching exam card:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get exam card by applicant
const getExamCardByApplicantController = async (req, res) => {
  try {
    const { applicantId } = req.params;

    const examCard = await findExamCardByApplicant(applicantId);
    if (!examCard) {
      return res.status(404).json({
        success: false,
        message: 'Exam card not found for this applicant'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exam card retrieved successfully',
      data: examCard
    });

  } catch (error) {
    console.error('Error fetching exam card:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Mark exam card as printed
const markExamCardAsPrintedController = async (req, res) => {
  try {
    const { id } = req.params;
    const printed_by = req.user.id;

    // Check if exam card exists
    const existingExamCard = await findExamCardById(id);
    if (!existingExamCard) {
      return res.status(404).json({
        success: false,
        message: 'Exam card not found'
      });
    }

    // Check if already printed
    if (existingExamCard.is_printed) {
      return res.status(400).json({
        success: false,
        message: 'Exam card already printed'
      });
    }

    // Mark as printed
    const updatedExamCard = await markExamCardAsPrinted(id, printed_by);

    res.status(200).json({
      success: true,
      message: 'Exam card marked as printed successfully',
      data: updatedExamCard
    });

  } catch (error) {
    console.error('Error marking exam card as printed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update exam card files
const updateExamCardFilesController = async (req, res) => {
  try {
    const { id } = req.params;
    const { qr_code_image, card_image, card_pdf } = req.body;

    // Check if exam card exists
    const existingExamCard = await findExamCardById(id);
    if (!existingExamCard) {
      return res.status(404).json({
        success: false,
        message: 'Exam card not found'
      });
    }

    // Update files
    const updatedExamCard = await updateExamCardFiles(id, {
      qr_code_image,
      card_image,
      card_pdf
    });

    res.status(200).json({
      success: true,
      message: 'Exam card files updated successfully',
      data: updatedExamCard
    });

  } catch (error) {
    console.error('Error updating exam card files:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get exam card statistics
const getExamCardStatsController = async (req, res) => {
  try {
    const stats = await getExamCardStats();

    res.status(200).json({
      success: true,
      message: 'Exam card statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Error fetching exam card statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get exam cards by entry date
const getExamCardsByEntryDateController = async (req, res) => {
  try {
    const { entryDateId } = req.params;

    const examCards = await findExamCardsByEntryDate(entryDateId);

    res.status(200).json({
      success: true,
      message: 'Exam cards retrieved successfully',
      data: examCards
    });

  } catch (error) {
    console.error('Error fetching exam cards by entry date:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Search exam cards
const searchExamCardsController = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const options = {
      page: 1,
      limit: parseInt(limit),
      search: q.trim()
    };

    const result = await findAllExamCards(options);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: result.examCards,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error searching exam cards:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get exam card dashboard data
const getExamCardDashboardController = async (req, res) => {
  try {
    const [stats, recentCards] = await Promise.all([
      getExamCardStats(),
      findAllExamCards({ page: 1, limit: 5 })
    ]);

    res.status(200).json({
      success: true,
      message: 'Exam card dashboard data retrieved successfully',
      data: {
        stats,
        recentCards: recentCards.examCards
      }
    });

  } catch (error) {
    console.error('Error fetching exam card dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Generate exam card number
const generateExamCardNumberController = async (req, res) => {
  try {
    const cardNumber = await generateExamCardNumber();

    res.status(200).json({
      success: true,
      message: 'Exam card number generated successfully',
      data: { card_number: cardNumber }
    });

  } catch (error) {
    console.error('Error generating exam card number:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Upload exam card files
const uploadExamCardFilesController = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { id } = req.params;
    
    // Check if exam card exists
    const existingExamCard = await findExamCardById(id);
    if (!existingExamCard) {
      return res.status(404).json({
        success: false,
        message: 'Exam card not found'
      });
    }

    const fileData = {};
    
    // Process uploaded files
    if (req.files.qr_code_image) {
      fileData.qr_code_image = req.files.qr_code_image[0].path;
    }
    if (req.files.card_image) {
      fileData.card_image = req.files.card_image[0].path;
    }
    if (req.files.card_pdf) {
      fileData.card_pdf = req.files.card_pdf[0].path;
    }

    // Update exam card files
    const updatedExamCard = await updateExamCardFiles(id, fileData);

    res.status(200).json({
      success: true,
      message: 'Exam card files uploaded successfully',
      data: {
        examCard: updatedExamCard,
        files: req.files
      }
    });

  } catch (error) {
    console.error('Error uploading exam card files:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get printable exam cards
const getPrintableExamCardsController = async (req, res) => {
  try {
    const { entry_date_id = null } = req.query;

    const options = {
      page: 1,
      limit: 1000, // Large limit for printing
      is_printed: false
    };

    if (entry_date_id) {
      options.entry_date_id = entry_date_id;
    }

    const result = await findAllExamCards(options);

    res.status(200).json({
      success: true,
      message: 'Printable exam cards retrieved successfully',
      data: result.examCards
    });

  } catch (error) {
    console.error('Error fetching printable exam cards:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Bulk print exam cards
const bulkPrintExamCardsController = async (req, res) => {
  try {
    const { exam_card_ids } = req.body;
    const printed_by = req.user.id;

    if (!exam_card_ids || !Array.isArray(exam_card_ids) || exam_card_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Exam card IDs array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const cardId of exam_card_ids) {
      try {
        const examCard = await findExamCardById(cardId);
        if (!examCard) {
          errors.push({ id: cardId, error: 'Exam card not found' });
          continue;
        }

        if (examCard.is_printed) {
          errors.push({ id: cardId, error: 'Already printed' });
          continue;
        }

        const updatedCard = await markExamCardAsPrinted(cardId, printed_by);
        results.push(updatedCard);
      } catch (error) {
        errors.push({ id: cardId, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk print operation completed',
      data: {
        printed: results,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error in bulk print operation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update exam card exam date
const updateExamCardController = async (req, res) => {
  try {
    const { id } = req.params;
    const { entry_date_id } = req.body;

    if (!entry_date_id) {
      return res.status(400).json({
        success: false,
        message: 'Entry date ID is required'
      });
    }

    // Check if exam card exists
    const existingCard = await findExamCardById(id);
    if (!existingCard) {
      return res.status(404).json({
        success: false,
        message: 'Exam card not found'
      });
    }

    // Update the exam card with new entry date
    const query = `
      UPDATE exam_cards 
      SET entry_date_id = ? 
      WHERE id = ?
    `;
    
    const { executeQuery } = require('../configs/db.config');
    await executeQuery(query, [entry_date_id, id]);

    // Get updated exam card
    const updatedCard = await findExamCardById(id);

    res.status(200).json({
      success: true,
      message: 'Exam card updated successfully',
      data: updatedCard
    });

  } catch (error) {
    console.error('Error updating exam card:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createExamCardController,
  getAllExamCardsController,
  getExamCardByIdController,
  getExamCardByCardNumberController,
  getExamCardByApplicantController,
  markExamCardAsPrintedController,
  updateExamCardFilesController,
  getExamCardStatsController,
  getExamCardsByEntryDateController,
  searchExamCardsController,
  getExamCardDashboardController,
  generateExamCardNumberController,
  uploadExamCardFilesController,
  getPrintableExamCardsController,
  bulkPrintExamCardsController,
  updateExamCardController
};
