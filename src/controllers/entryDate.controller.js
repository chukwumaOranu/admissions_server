const {
  createEntryDate,
  findEntryDateById,
  findAllEntryDates,
  updateEntryDate,
  deleteEntryDate,
  findAvailableEntryDates,
  checkEntryDateCapacity,
  getEntryDateStats,
  getUpcomingExams,
  getExamCalendarAvailability
} = require('../models/payment-exam.model');

// =====================================================
// ENTRY DATE CONTROLLER FUNCTIONS
// =====================================================

// Create new entry date
const createEntryDateController = async (req, res) => {
  try {
    const {
      exam_title,
      exam_description,
      exam_date,
      exam_time,
      exam_duration,
      exam_venue,
      exam_address,
      max_capacity,
      registration_deadline,
      instructions,
      requirements
    } = req.body;

    const created_by = req.user.id; // From authentication middleware

    // Validate required fields
    if (!exam_title || !exam_date || !exam_time || !exam_venue) {
      return res.status(400).json({
        success: false,
        message: 'Exam title, date, time, and venue are required'
      });
    }

    // Validate exam date is in the future
    const examDateTime = new Date(`${exam_date} ${exam_time}`);
    if (examDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Exam date must be in the future'
      });
    }

    // Create entry date
    const entryDate = await createEntryDate({
      exam_title,
      exam_description,
      exam_date,
      exam_time,
      exam_duration: exam_duration || 120,
      exam_venue,
      exam_address,
      max_capacity: max_capacity || 100,
      registration_deadline,
      instructions,
      requirements,
      created_by
    });

    res.status(201).json({
      success: true,
      message: 'Entry date created successfully',
      data: entryDate
    });

  } catch (error) {
    console.error('Error creating entry date:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all entry dates (active by default)
const getAllEntryDatesController = async (req, res) => {
  try {
    const {
      is_active = 'true', // Default to only active entries
      exam_date_from = null,
      exam_date_to = null,
      has_capacity = null
    } = req.query;

    const options = {
      is_active: is_active !== null ? is_active === 'true' : true, // Default to true if not specified
      exam_date_from,
      exam_date_to,
      has_capacity: has_capacity !== null ? has_capacity === 'true' : null
    };

    const entryDates = await findAllEntryDates(options);

    res.status(200).json({
      success: true,
      message: 'Entry dates retrieved successfully',
      data: entryDates
    });

  } catch (error) {
    console.error('Error fetching entry dates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all entry dates including inactive (for admin management)
const getAllEntryDatesAdminController = async (req, res) => {
  try {
    const {
      is_active = null, // Include all by default for admin
      exam_date_from = null,
      exam_date_to = null,
      has_capacity = null
    } = req.query;

    const options = {
      is_active: is_active !== null ? is_active === 'true' : null,
      exam_date_from,
      exam_date_to,
      has_capacity: has_capacity !== null ? has_capacity === 'true' : null
    };

    const entryDates = await findAllEntryDates(options);

    res.status(200).json({
      success: true,
      message: 'All entry dates retrieved successfully',
      data: entryDates
    });

  } catch (error) {
    console.error('Error fetching all entry dates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get entry date by ID
const getEntryDateByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const entryDate = await findEntryDateById(id);
    if (!entryDate) {
      return res.status(404).json({
        success: false,
        message: 'Entry date not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Entry date retrieved successfully',
      data: entryDate
    });

  } catch (error) {
    console.error('Error fetching entry date:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update entry date
const updateEntryDateController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if entry date exists
    const existingEntryDate = await findEntryDateById(id);
    if (!existingEntryDate) {
      return res.status(404).json({
        success: false,
        message: 'Entry date not found'
      });
    }

    // Validate exam date if being updated
    if (updateData.exam_date && updateData.exam_time) {
      const examDateTime = new Date(`${updateData.exam_date} ${updateData.exam_time}`);
      if (examDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Exam date must be in the future'
        });
      }
    }

    // Update entry date
    const updatedEntryDate = await updateEntryDate(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Entry date updated successfully',
      data: updatedEntryDate
    });

  } catch (error) {
    console.error('Error updating entry date:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete entry date
const deleteEntryDateController = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if entry date exists
    const existingEntryDate = await findEntryDateById(id);
    if (!existingEntryDate) {
      return res.status(404).json({
        success: false,
        message: 'Entry date not found'
      });
    }

    // Delete entry date
    const deleted = await deleteEntryDate(id);

    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete entry date'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Entry date deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting entry date:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get available entry dates
const getAvailableEntryDatesController = async (req, res) => {
  try {
    const availableDates = await findAvailableEntryDates();

    res.status(200).json({
      success: true,
      message: 'Available entry dates retrieved successfully',
      data: availableDates
    });

  } catch (error) {
    console.error('Error fetching available entry dates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check entry date capacity
const checkEntryDateCapacityController = async (req, res) => {
  try {
    const { id } = req.params;

    const hasCapacity = await checkEntryDateCapacity(id);

    res.status(200).json({
      success: true,
      message: 'Capacity check completed',
      data: { has_capacity: hasCapacity }
    });

  } catch (error) {
    console.error('Error checking entry date capacity:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get entry date statistics
const getEntryDateStatsController = async (req, res) => {
  try {
    const stats = await getEntryDateStats();

    res.status(200).json({
      success: true,
      message: 'Entry date statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Error fetching entry date statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get upcoming exams
const getUpcomingExamsController = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const upcomingExams = await getUpcomingExams(parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Upcoming exams retrieved successfully',
      data: upcomingExams
    });

  } catch (error) {
    console.error('Error fetching upcoming exams:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getExamCalendarAvailabilityController = async (req, res) => {
  try {
    const calendar = await getExamCalendarAvailability();
    res.status(200).json({
      success: true,
      message: 'Exam calendar availability retrieved successfully',
      data: calendar
    });
  } catch (error) {
    console.error('Error fetching exam calendar availability:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Search entry dates
const searchEntryDatesController = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Get all entry dates and filter by search query
    const allEntryDates = await findAllEntryDates();
    const filteredDates = allEntryDates.filter(date => 
      date.exam_title.toLowerCase().includes(q.toLowerCase()) ||
      date.exam_venue.toLowerCase().includes(q.toLowerCase()) ||
      date.exam_description?.toLowerCase().includes(q.toLowerCase())
    ).slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: filteredDates
    });

  } catch (error) {
    console.error('Error searching entry dates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get exam dashboard data
const getExamDashboardController = async (req, res) => {
  try {
    const [stats, upcomingExams, availableDates] = await Promise.all([
      getEntryDateStats(),
      getUpcomingExams(5),
      findAvailableEntryDates()
    ]);

    res.status(200).json({
      success: true,
      message: 'Exam dashboard data retrieved successfully',
      data: {
        stats,
        upcomingExams,
        availableDates
      }
    });

  } catch (error) {
    console.error('Error fetching exam dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Activate/Deactivate entry date
const toggleEntryDateStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Check if entry date exists
    const existingEntryDate = await findEntryDateById(id);
    if (!existingEntryDate) {
      return res.status(404).json({
        success: false,
        message: 'Entry date not found'
      });
    }

    // Update status
    const updatedEntryDate = await updateEntryDate(id, { is_active });

    res.status(200).json({
      success: true,
      message: `Entry date ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: updatedEntryDate
    });

  } catch (error) {
    console.error('Error toggling entry date status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get exam venues
const getExamVenuesController = async (req, res) => {
  try {
    const allEntryDates = await findAllEntryDates();
    const venues = [...new Set(allEntryDates.map(date => date.exam_venue))]
      .filter(venue => venue)
      .sort();

    res.status(200).json({
      success: true,
      message: 'Exam venues retrieved successfully',
      data: venues
    });

  } catch (error) {
    console.error('Error fetching exam venues:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get exam schedule by date range
const getExamScheduleController = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const options = {
      exam_date_from: start_date,
      exam_date_to: end_date
    };

    const schedule = await findAllEntryDates(options);

    res.status(200).json({
      success: true,
      message: 'Exam schedule retrieved successfully',
      data: schedule
    });

  } catch (error) {
    console.error('Error fetching exam schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createEntryDateController,
  getAllEntryDatesController,
  getAllEntryDatesAdminController,
  getEntryDateByIdController,
  updateEntryDateController,
  deleteEntryDateController,
  getAvailableEntryDatesController,
  checkEntryDateCapacityController,
  getEntryDateStatsController,
  getUpcomingExamsController,
  getExamCalendarAvailabilityController,
  searchEntryDatesController,
  getExamDashboardController,
  toggleEntryDateStatusController,
  getExamVenuesController,
  getExamScheduleController
};
