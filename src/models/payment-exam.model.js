const { executeQuery } = require('../configs/db.config');

// =====================================================
// PAYMENT TRANSACTION FUNCTIONS
// =====================================================

// Create new payment transaction
const createPaymentTransaction = async (transactionData) => {
  try {
    const {
      transaction_reference,
      applicant_id,
      amount,
      currency,
      payment_method,
      payment_status,
      paystack_response,
      gateway_response
    } = transactionData;

    const query = `
      INSERT INTO payment_transactions 
      (transaction_reference, applicant_id, amount, currency, payment_method, 
       payment_status, paystack_response, gateway_response)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      transaction_reference,
      applicant_id,
      amount,
      currency || 'NGN',
      payment_method || 'card',
      payment_status || 'pending',
      paystack_response ? JSON.stringify(paystack_response) : null,
      gateway_response ?? null
    ];

    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Payment transaction insert failed: insertId not returned');
    }
    
    return await findPaymentTransactionById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create payment transaction: ${error.message}`);
  }
};

// Find payment transaction by reference
const findPaymentTransactionByReference = async (reference) => {
  try {
    const query = `
      SELECT pt.*, a.application_number, a.first_name, a.last_name, a.email, a.user_id as applicant_user_id
      FROM payment_transactions pt
      JOIN applicants a ON pt.applicant_id = a.id
      WHERE pt.transaction_reference = ?
    `;

    const { rows } = await executeQuery(query, [reference]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find payment transaction by reference: ${error.message}`);
  }
};

// Find payment transaction by ID
const findPaymentTransactionById = async (id) => {
  try {
    const query = `
      SELECT pt.*, a.application_number, a.first_name, a.last_name, a.email, a.user_id as applicant_user_id
      FROM payment_transactions pt
      JOIN applicants a ON pt.applicant_id = a.id
      WHERE pt.id = ?
    `;

    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find payment transaction by ID: ${error.message}`);
  }
};

// Get transactions by applicant
const findPaymentTransactionsByApplicant = async (applicantId) => {
  try {
    const query = `
      SELECT pt.*, a.application_number, a.first_name, a.last_name, a.email, a.user_id as applicant_user_id
      FROM payment_transactions pt
      JOIN applicants a ON pt.applicant_id = a.id
      WHERE pt.applicant_id = ? AND pt.payment_status = 'success'
      ORDER BY pt.created_at DESC
    `;

    const { rows } = await executeQuery(query, [applicantId]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find payment transactions by applicant: ${error.message}`);
  }
};

// Get transactions by current user (student)
const findPaymentTransactionsByUser = async (userId) => {
  try {
    const query = `
      SELECT pt.*, a.application_number, a.first_name, a.last_name, a.email, a.user_id as applicant_user_id
      FROM payment_transactions pt
      JOIN applicants a ON pt.applicant_id = a.id
      WHERE a.user_id = ? AND pt.payment_status = 'success'
      ORDER BY pt.created_at DESC
    `;

    const { rows } = await executeQuery(query, [userId]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find payment transactions by user: ${error.message}`);
  }
};

// Update transaction status
const updatePaymentTransactionStatus = async (id, status, paystackResponse = null) => {
  try {
    const query = `
      UPDATE payment_transactions 
      SET payment_status = ?, paystack_response = ?, paid_at = NOW(), updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(query, [
      status,
      paystackResponse ? JSON.stringify(paystackResponse) : null,
      id
    ]);
    
    return await findPaymentTransactionById(id);
  } catch (error) {
    throw new Error(`Failed to update payment transaction status: ${error.message}`);
  }
};

// Update payment transaction details
const updatePaymentTransaction = async (id, transactionData) => {
  try {
    const allowedFields = [
      'transaction_reference',
      'applicant_id',
      'amount',
      'currency',
      'payment_method',
      'payment_status',
      'paystack_response',
      'gateway_response',
      'paid_at'
    ];
    const updates = [];
    const params = [];

    for (const [key, value] of Object.entries(transactionData)) {
      if (!allowedFields.includes(key) || value === undefined) continue;
      updates.push(`${key} = ?`);
      params.push(key === 'paystack_response' && value ? JSON.stringify(value) : value);
    }

    if (transactionData.payment_status === 'success' && !Object.prototype.hasOwnProperty.call(transactionData, 'paid_at')) {
      updates.push('paid_at = COALESCE(paid_at, NOW())');
    }

    if (updates.length === 0) {
      throw new Error('No valid payment transaction fields to update');
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await executeQuery(`UPDATE payment_transactions SET ${updates.join(', ')} WHERE id = ?`, params);
    return await findPaymentTransactionById(id);
  } catch (error) {
    throw new Error(`Failed to update payment transaction: ${error.message}`);
  }
};

// Delete payment transaction
const deletePaymentTransaction = async (id) => {
  try {
    const result = await executeQuery('DELETE FROM payment_transactions WHERE id = ?', [id]);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Failed to delete payment transaction: ${error.message}`);
  }
};

// Get all transactions with pagination
const findAllPaymentTransactions = async (options = {}) => {
  try {
    const { page = 1, limit = 10, search = '', payment_status = null, payment_method = null, date_from = null, date_to = null } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT pt.*, a.application_number, a.first_name, a.last_name, a.email, a.user_id as applicant_user_id
      FROM payment_transactions pt
      JOIN applicants a ON pt.applicant_id = a.id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (search) {
      query += ` AND (pt.transaction_reference LIKE ? OR a.application_number LIKE ? OR a.first_name LIKE ? OR a.last_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (payment_status) {
      query += ` AND pt.payment_status = ?`;
      params.push(payment_status);
    }

    if (payment_method) {
      query += ` AND pt.payment_method = ?`;
      params.push(payment_method);
    }

    if (date_from) {
      query += ` AND DATE(pt.created_at) >= ?`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND DATE(pt.created_at) <= ?`;
      params.push(date_to);
    }

    query += ` ORDER BY pt.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const { rows } = await executeQuery(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM payment_transactions pt
      JOIN applicants a ON pt.applicant_id = a.id
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND (pt.transaction_reference LIKE ? OR a.application_number LIKE ? OR a.first_name LIKE ? OR a.last_name LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (payment_status) {
      countQuery += ` AND pt.payment_status = ?`;
      countParams.push(payment_status);
    }

    if (payment_method) {
      countQuery += ` AND pt.payment_method = ?`;
      countParams.push(payment_method);
    }

    if (date_from) {
      countQuery += ` AND DATE(pt.created_at) >= ?`;
      countParams.push(date_from);
    }

    if (date_to) {
      countQuery += ` AND DATE(pt.created_at) <= ?`;
      countParams.push(date_to);
    }

    const { rows: countRows } = await executeQuery(countQuery, countParams);
    const total = countRows[0].total;

    return {
      transactions: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to find payment transactions: ${error.message}`);
  }
};

// Get payment statistics
const getPaymentStats = async () => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN payment_status = 'success' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_payments,
        COUNT(CASE WHEN payment_status = 'cancelled' THEN 1 END) as cancelled_payments,
        SUM(CASE WHEN payment_status = 'success' THEN amount ELSE 0 END) as total_amount_collected,
        AVG(CASE WHEN payment_status = 'success' THEN amount ELSE NULL END) as average_payment_amount
      FROM payment_transactions
    `;

    const { rows } = await executeQuery(query);
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to get payment statistics: ${error.message}`);
  }
};

// Get daily payment summary
const getDailyPaymentSummary = async (days = 30) => {
  try {
    const query = `
      SELECT 
        DATE(created_at) as payment_date,
        COUNT(*) as transaction_count,
        COUNT(CASE WHEN payment_status = 'success' THEN 1 END) as successful_count,
        SUM(CASE WHEN payment_status = 'success' THEN amount ELSE 0 END) as total_amount
      FROM payment_transactions
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY payment_date DESC
    `;

    const { rows } = await executeQuery(query, [days]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get daily payment summary: ${error.message}`);
  }
};

// =====================================================
// ENTRY DATE FUNCTIONS
// =====================================================

// Create new entry date
const createEntryDate = async (entryDateData) => {
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
      requirements,
      created_by
    } = entryDateData;

    const query = `
      INSERT INTO entry_dates 
      (exam_title, exam_description, exam_date, exam_time, exam_duration, 
       exam_venue, exam_address, max_capacity, registration_deadline, 
       instructions, requirements, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      exam_title,
      exam_description ?? null,
      exam_date,
      exam_time,
      exam_duration || 120,
      exam_venue,
      exam_address ?? null,
      max_capacity || 100,
      registration_deadline ?? null,
      instructions ?? null,
      requirements ?? null,
      created_by
    ];

    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Entry date insert failed: insertId not returned');
    }
    
    return await findEntryDateById(result.insertId);
  } catch (error) {
    throw new Error(`Failed to create entry date: ${error.message}`);
  }
};

// Find entry date by ID
const findEntryDateById = async (id) => {
  try {
    const query = `
      SELECT ed.*, u.username as created_by_username
      FROM entry_dates ed
      LEFT JOIN users u ON ed.created_by = u.id
      WHERE ed.id = ?
    `;

    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find entry date by ID: ${error.message}`);
  }
};

// Get all entry dates
const findAllEntryDates = async (options = {}) => {
  try {
    const { is_active = null, exam_date_from = null, exam_date_to = null, has_capacity = null } = options;
    
    let query = `
      SELECT ed.*, u.username as created_by_username
      FROM entry_dates ed
      LEFT JOIN users u ON ed.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (is_active !== null) {
      query += ` AND ed.is_active = ?`;
      params.push(is_active);
    }

    if (exam_date_from) {
      query += ` AND ed.exam_date >= ?`;
      params.push(exam_date_from);
    }

    if (exam_date_to) {
      query += ` AND ed.exam_date <= ?`;
      params.push(exam_date_to);
    }

    if (has_capacity) {
      query += ` AND ed.current_registrations < ed.max_capacity`;
    }

    query += ` ORDER BY ed.exam_date ASC, ed.exam_time ASC`;

    const { rows } = await executeQuery(query, params);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find entry dates: ${error.message}`);
  }
};

// Update entry date
const updateEntryDate = async (id, updateData) => {
  try {
    const allowedFields = [
      'exam_title', 'exam_description', 'exam_date', 'exam_time', 'exam_duration',
      'exam_venue', 'exam_address', 'max_capacity', 'registration_deadline',
      'instructions', 'requirements', 'is_active'
    ];
    const updates = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value ?? null);
      }
    }
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updates.push('updated_at = NOW()');
    params.push(id);
    
    const query = `UPDATE entry_dates SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    return await findEntryDateById(id);
  } catch (error) {
    throw new Error(`Failed to update entry date: ${error.message}`);
  }
};

// Delete entry date (soft delete)
const deleteEntryDate = async (id) => {
  try {
    const query = 'UPDATE entry_dates SET is_active = FALSE, updated_at = NOW() WHERE id = ?';
    await executeQuery(query, [id]);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete entry date: ${error.message}`);
  }
};

// Get available entry dates (with capacity)
const findAvailableEntryDates = async () => {
  try {
    const query = `
      SELECT ed.*, u.username as created_by_username
      FROM entry_dates ed
      LEFT JOIN users u ON ed.created_by = u.id
      WHERE ed.is_active = TRUE 
        AND ed.exam_date >= CURDATE()
        AND ed.current_registrations < ed.max_capacity
        AND (ed.registration_deadline IS NULL OR ed.registration_deadline >= CURDATE())
      ORDER BY ed.exam_date ASC, ed.exam_time ASC
    `;

    const { rows } = await executeQuery(query);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find available entry dates: ${error.message}`);
  }
};

// Check if entry date has capacity
const checkEntryDateCapacity = async (entryDateId) => {
  try {
    const query = `
      SELECT max_capacity, current_registrations
      FROM entry_dates
      WHERE id = ? AND is_active = TRUE
    `;

    const { rows } = await executeQuery(query, [entryDateId]);
    if (rows.length === 0) return false;
    
    const { max_capacity, current_registrations } = rows[0];
    return current_registrations < max_capacity;
  } catch (error) {
    throw new Error(`Failed to check entry date capacity: ${error.message}`);
  }
};

// Get entry date statistics
const getEntryDateStats = async () => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_entry_dates,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_entry_dates,
        COUNT(CASE WHEN exam_date >= CURDATE() THEN 1 END) as upcoming_exams,
        COUNT(CASE WHEN exam_date < CURDATE() THEN 1 END) as past_exams,
        SUM(max_capacity) as total_capacity,
        SUM(current_registrations) as total_registrations,
        AVG(max_capacity) as average_capacity
      FROM entry_dates
    `;

    const { rows } = await executeQuery(query);
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to get entry date statistics: ${error.message}`);
  }
};

// Get upcoming exams
const getUpcomingExams = async (limit = 10) => {
  try {
    const query = `
      SELECT ed.*, u.username as created_by_username
      FROM entry_dates ed
      LEFT JOIN users u ON ed.created_by = u.id
      WHERE ed.is_active = TRUE AND ed.exam_date >= CURDATE()
      ORDER BY ed.exam_date ASC, ed.exam_time ASC
      LIMIT ?
    `;

    const { rows } = await executeQuery(query, [limit]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to get upcoming exams: ${error.message}`);
  }
};

const getExamCalendarAvailability = async () => {
  const query = `
    SELECT
      ed.exam_date,
      COUNT(ed.id) AS total_slots,
      SUM(CASE WHEN ed.current_registrations < ed.max_capacity THEN 1 ELSE 0 END) AS open_slots,
      SUM(ed.max_capacity) AS total_capacity,
      SUM(ed.current_registrations) AS used_capacity
    FROM entry_dates ed
    WHERE ed.is_active = TRUE
      AND ed.exam_date >= CURDATE()
    GROUP BY ed.exam_date
    ORDER BY ed.exam_date ASC
  `;
  const { rows } = await executeQuery(query);
  return rows;
};

const findNextAvailableEntryDate = async () => {
  const query = `
    SELECT ed.*
    FROM entry_dates ed
    WHERE ed.is_active = TRUE
      AND ed.exam_date >= CURDATE()
      AND ed.current_registrations < ed.max_capacity
      AND (ed.registration_deadline IS NULL OR ed.registration_deadline >= CURDATE())
    ORDER BY ed.exam_date ASC, ed.exam_time ASC
    LIMIT 1
  `;

  const { rows } = await executeQuery(query);
  return rows[0] || null;
};

const syncEntryDateCurrentRegistrations = async (entryDateId) => {
  if (!entryDateId) return null;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM applicants
    WHERE exam_date_id = ?
  `;
  const { rows } = await executeQuery(countQuery, [entryDateId]);
  const total = Number(rows[0]?.total || 0);

  await executeQuery(
    'UPDATE entry_dates SET current_registrations = ?, updated_at = NOW() WHERE id = ?',
    [total, entryDateId]
  );

  return total;
};

// =====================================================
// EXAM CARD FUNCTIONS
// =====================================================

// Generate exam card number
const generateExamCardNumber = async () => {
  try {
    const year = new Date().getFullYear();
    const query = `
      SELECT COALESCE(MAX(CAST(SUBSTRING(card_number, 6) AS UNSIGNED)), 0) + 1 as next_number
      FROM exam_cards 
      WHERE card_number LIKE ?
    `;
    
    const { rows } = await executeQuery(query, [`CARD${year}%`]);
    const nextNumber = rows[0].next_number;
    
    return `CARD${year}${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    throw new Error(`Failed to generate exam card number: ${error.message}`);
  }
};

// Create new exam card
const createExamCard = async (examCardData) => {
  try {
    const {
      applicant_id,
      entry_date_id,
      qr_code_data,
      qr_code_image,
      card_image,
      card_pdf
    } = examCardData;

    // Generate card number
    const card_number = await generateExamCardNumber();

    const query = `
      INSERT INTO exam_cards 
      (applicant_id, entry_date_id, card_number, qr_code_data, qr_code_image, card_image, card_pdf)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      applicant_id,
      entry_date_id,
      card_number,
      qr_code_data ?? null,
      qr_code_image ?? null,
      card_image ?? null,
      card_pdf ?? null
    ];

    const result = await executeQuery(query, params);
    
    if (!result.insertId) {
      throw new Error('Exam card insert failed: insertId not returned');
    }
    
    return { id: result.insertId, card_number };
  } catch (error) {
    throw new Error(`Failed to create exam card: ${error.message}`);
  }
};

// Find exam card by ID
const findExamCardById = async (id) => {
  try {
    const query = `
      SELECT ec.*, a.application_number, a.first_name, a.last_name, a.email, 
             a.passport_photo, ed.exam_title, ed.exam_date, ed.exam_time, ed.exam_venue
      FROM exam_cards ec
      JOIN applicants a ON ec.applicant_id = a.id
      JOIN entry_dates ed ON ec.entry_date_id = ed.id
      WHERE ec.id = ?
    `;

    const { rows } = await executeQuery(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find exam card by ID: ${error.message}`);
  }
};

// Find exam card by card number
const findExamCardByCardNumber = async (cardNumber) => {
  try {
    const query = `
      SELECT ec.*, a.application_number, a.first_name, a.last_name, a.email, 
             a.passport_photo, ed.exam_title, ed.exam_date, ed.exam_time, ed.exam_venue
      FROM exam_cards ec
      JOIN applicants a ON ec.applicant_id = a.id
      JOIN entry_dates ed ON ec.entry_date_id = ed.id
      WHERE ec.card_number = ?
    `;

    const { rows } = await executeQuery(query, [cardNumber]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find exam card by card number: ${error.message}`);
  }
};

// Find exam card by applicant
const findExamCardByApplicant = async (applicantId) => {
  try {
    const query = `
      SELECT ec.*, a.application_number, a.first_name, a.last_name, a.email, 
             a.passport_photo, ed.exam_title, ed.exam_date, ed.exam_time, ed.exam_venue
      FROM exam_cards ec
      JOIN applicants a ON ec.applicant_id = a.id
      JOIN entry_dates ed ON ec.entry_date_id = ed.id
      WHERE ec.applicant_id = ?
    `;

    const { rows } = await executeQuery(query, [applicantId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Failed to find exam card by applicant: ${error.message}`);
  }
};

// Get all exam cards with pagination
const findAllExamCards = async (options = {}) => {
  try {
    console.log('🔍 findAllExamCards called with options:', options);
    const { page = 1, limit = 10, search = '', entry_date_id = null, is_printed = null } = options;
    const offset = (page - 1) * limit;
    
    console.log('📊 Parsed parameters:', { page, limit, search, entry_date_id, is_printed, offset });
    
    // First, let's try a simple query to check if the table exists
    let query = `
      SELECT ec.*
      FROM exam_cards ec
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND ec.card_number LIKE ?`;
      params.push(`%${search}%`);
    }

    if (entry_date_id && entry_date_id !== 'null' && entry_date_id !== '') {
      query += ` AND ec.entry_date_id = ?`;
      params.push(parseInt(entry_date_id));
    }

    if (is_printed !== null && is_printed !== undefined && is_printed !== '') {
      query += ` AND ec.is_printed = ?`;
      params.push(Boolean(is_printed));
    }

    query += ` ORDER BY ec.generated_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    console.log('🔍 Final query:', query);
    console.log('📊 Query parameters:', params);
    console.log('📊 Parameter count:', params.length);
    console.log('📊 Placeholder count:', (query.match(/\?/g) || []).length);
    
    const { rows } = await executeQuery(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM exam_cards ec
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND ec.card_number LIKE ?`;
      countParams.push(`%${search}%`);
    }

    if (entry_date_id && entry_date_id !== 'null' && entry_date_id !== '') {
      countQuery += ` AND ec.entry_date_id = ?`;
      countParams.push(parseInt(entry_date_id));
    }

    if (is_printed !== null && is_printed !== undefined && is_printed !== '') {
      countQuery += ` AND ec.is_printed = ?`;
      countParams.push(Boolean(is_printed));
    }

    console.log('🔍 Count query:', countQuery);
    console.log('📊 Count parameters:', countParams);
    console.log('📊 Count parameter count:', countParams.length);
    console.log('📊 Count placeholder count:', (countQuery.match(/\?/g) || []).length);

    const { rows: countRows } = await executeQuery(countQuery, countParams);
    const total = countRows[0].total;

    console.log('✅ Query executed successfully, found', rows.length, 'exam cards, total:', total);

    return {
      examCards: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('Query parameters:', options);
    throw new Error(`Failed to find exam cards: ${error.message}`);
  }
};

// Mark exam card as printed
const markExamCardAsPrinted = async (examCardId, printedBy) => {
  try {
    const query = `
      UPDATE exam_cards 
      SET is_printed = TRUE, printed_at = NOW(), printed_by = ?
      WHERE id = ?
    `;

    await executeQuery(query, [printedBy, examCardId]);
    return await findExamCardById(examCardId);
  } catch (error) {
    throw new Error(`Failed to mark exam card as printed: ${error.message}`);
  }
};

// Update exam card files
const updateExamCardFiles = async (examCardId, fileData) => {
  try {
    const { qr_code_image, card_image, card_pdf } = fileData;

    const query = `
      UPDATE exam_cards 
      SET qr_code_image = ?, card_image = ?, card_pdf = ?
      WHERE id = ?
    `;

    await executeQuery(query, [qr_code_image, card_image, card_pdf, examCardId]);
    return await findExamCardById(examCardId);
  } catch (error) {
    throw new Error(`Failed to update exam card files: ${error.message}`);
  }
};

// Get exam card statistics
const getExamCardStats = async () => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_exam_cards,
        COUNT(CASE WHEN is_printed = TRUE THEN 1 END) as printed_cards,
        COUNT(CASE WHEN is_printed = FALSE THEN 1 END) as unprinted_cards
      FROM exam_cards
    `;

    const { rows } = await executeQuery(query);
    return rows[0];
  } catch (error) {
    throw new Error(`Failed to get exam card statistics: ${error.message}`);
  }
};

// Get exam cards by entry date
const findExamCardsByEntryDate = async (entryDateId) => {
  try {
    const query = `
      SELECT ec.*, a.application_number, a.first_name, a.last_name, a.email, 
             a.passport_photo, ed.exam_title, ed.exam_date, ed.exam_time, ed.exam_venue
      FROM exam_cards ec
      JOIN applicants a ON ec.applicant_id = a.id
      JOIN entry_dates ed ON ec.entry_date_id = ed.id
      WHERE ec.entry_date_id = ?
      ORDER BY a.first_name, a.last_name
    `;

    const { rows } = await executeQuery(query, [entryDateId]);
    return rows;
  } catch (error) {
    throw new Error(`Failed to find exam cards by entry date: ${error.message}`);
  }
};

module.exports = {
  // Payment Transaction functions
  createPaymentTransaction,
  findPaymentTransactionByReference,
  findPaymentTransactionById,
  findPaymentTransactionsByApplicant,
  findPaymentTransactionsByUser,
  updatePaymentTransactionStatus,
  updatePaymentTransaction,
  deletePaymentTransaction,
  findAllPaymentTransactions,
  getPaymentStats,
  getDailyPaymentSummary,
  
  // Entry Date functions
  createEntryDate,
  findEntryDateById,
  findAllEntryDates,
  updateEntryDate,
  deleteEntryDate,
  findAvailableEntryDates,
  checkEntryDateCapacity,
  getEntryDateStats,
  getUpcomingExams,
  getExamCalendarAvailability,
  findNextAvailableEntryDate,
  syncEntryDateCurrentRegistrations,
  
  // Exam Card functions
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
};
