const { executeQuery, executeTransaction } = require('../configs/db.config');

const ensureApplicantAdmissionSubjectsTable = async () => {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS applicant_admission_subjects (
      id INT PRIMARY KEY AUTO_INCREMENT,
      applicant_id INT NOT NULL,
      subject_id INT NOT NULL,
      assigned_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES admission_subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE KEY uniq_applicant_admission_subject (applicant_id, subject_id),
      INDEX idx_assigned_applicant (applicant_id),
      INDEX idx_assigned_subject (subject_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const getAdmissionSettings = async () => {
  const { rows } = await executeQuery(
    'SELECT * FROM admission_settings ORDER BY id DESC LIMIT 1'
  );
  return rows[0] || null;
};

const updateAdmissionBenchmark = async (benchmarkScore, updatedBy) => {
  const settings = await getAdmissionSettings();
  if (!settings) {
    await executeQuery(
      'INSERT INTO admission_settings (benchmark_score, updated_by) VALUES (?, ?)',
      [benchmarkScore, updatedBy]
    );
  } else {
    await executeQuery(
      'UPDATE admission_settings SET benchmark_score = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [benchmarkScore, updatedBy, settings.id]
    );
  }
  return await getAdmissionSettings();
};

const getAdmissionSubjects = async () => {
  const { rows } = await executeQuery(
    'SELECT * FROM admission_subjects WHERE is_active = TRUE ORDER BY subject_name ASC'
  );
  return rows;
};

const createAdmissionSubject = async ({ subject_name, max_score = 100, created_by }) => {
  const result = await executeQuery(
    'INSERT INTO admission_subjects (subject_name, max_score, created_by) VALUES (?, ?, ?)',
    [subject_name, max_score, created_by]
  );
  const { rows } = await executeQuery('SELECT * FROM admission_subjects WHERE id = ?', [result.insertId]);
  return rows[0];
};

const ensureApplicantIsExamEligible = async (applicantId) => {
  const { rows } = await executeQuery(
    'SELECT id, status, payment_status FROM applicants WHERE id = ? LIMIT 1',
    [applicantId]
  );
  const applicant = rows[0];
  if (!applicant) {
    throw new Error('Applicant not found');
  }
  if (applicant.payment_status !== 'paid') {
    throw new Error('Applicant must have a successful payment before exam processing');
  }
  if (applicant.status !== 'approved') {
    throw new Error('Applicant must be approved before exam processing');
  }
  return applicant;
};

const updateAdmissionSubject = async (id, data) => {
  const updates = [];
  const params = [];
  const allowed = ['subject_name', 'max_score', 'is_active'];

  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (updates.length === 0) {
    throw new Error('No valid subject fields to update');
  }

  updates.push('updated_at = NOW()');
  params.push(id);

  await executeQuery(
    `UPDATE admission_subjects SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const { rows } = await executeQuery('SELECT * FROM admission_subjects WHERE id = ?', [id]);
  return rows[0] || null;
};

const getApplicantAssignedSubjects = async (applicantId) => {
  await ensureApplicantAdmissionSubjectsTable();
  const { rows } = await executeQuery(
    `
    SELECT
      aas.subject_id,
      sub.subject_name,
      sub.max_score,
      COALESCE(score.score, 0) as score
    FROM applicant_admission_subjects aas
    JOIN admission_subjects sub ON sub.id = aas.subject_id
    LEFT JOIN applicant_subject_scores score
      ON score.applicant_id = aas.applicant_id AND score.subject_id = aas.subject_id
    WHERE aas.applicant_id = ? AND sub.is_active = TRUE
    ORDER BY sub.subject_name ASC
    `,
    [applicantId]
  );
  return rows;
};

const assignApplicantSubjects = async ({ applicantId, subjectIds, assignedBy }) => {
  await ensureApplicantAdmissionSubjectsTable();
  await ensureApplicantIsExamEligible(applicantId);
  const normalized = [...new Set((subjectIds || []).map(Number).filter(Boolean))];
  const queries = [
    {
      query: 'DELETE FROM applicant_admission_subjects WHERE applicant_id = ?',
      params: [applicantId]
    }
  ];

  normalized.forEach((subjectId) => {
    queries.push({
      query: `
        INSERT INTO applicant_admission_subjects (applicant_id, subject_id, assigned_by)
        VALUES (?, ?, ?)
      `,
      params: [applicantId, subjectId, assignedBy]
    });
  });

  await executeTransaction(queries);
  return await getApplicantAssignedSubjects(applicantId);
};

const assignSubjectsByExamDate = async ({ examDateId, subjectIds, assignedBy }) => {
  await ensureApplicantAdmissionSubjectsTable();
  const normalized = [...new Set((subjectIds || []).map(Number).filter(Boolean))];
  const { rows: applicants } = await executeQuery(
    `
    SELECT id
    FROM applicants
    WHERE exam_date_id = ? AND payment_status = 'paid' AND status = 'approved'
    `,
    [examDateId]
  );

  const queries = [];
  applicants.forEach((applicant) => {
    queries.push({
      query: 'DELETE FROM applicant_admission_subjects WHERE applicant_id = ?',
      params: [applicant.id]
    });
    normalized.forEach((subjectId) => {
      queries.push({
        query: `
          INSERT INTO applicant_admission_subjects (applicant_id, subject_id, assigned_by)
          VALUES (?, ?, ?)
        `,
        params: [applicant.id, subjectId, assignedBy]
      });
    });
  });

  if (queries.length > 0) await executeTransaction(queries);

  return {
    exam_date_id: Number(examDateId),
    applicant_count: applicants.length,
    subject_count: normalized.length
  };
};

const assignSubjectsToApplicants = async ({ applicantIds, subjectIds, assignedBy }) => {
  await ensureApplicantAdmissionSubjectsTable();
  const requestedApplicants = [...new Set((applicantIds || []).map(Number).filter(Boolean))];
  const normalizedSubjects = [...new Set((subjectIds || []).map(Number).filter(Boolean))];
  const { rows: eligibleApplicants } = requestedApplicants.length
    ? await executeQuery(
      `
      SELECT id
      FROM applicants
      WHERE id IN (${requestedApplicants.map(() => '?').join(',')})
        AND payment_status = 'paid'
        AND status = 'approved'
      `,
      requestedApplicants
    )
    : { rows: [] };
  const applicants = eligibleApplicants.map((applicant) => Number(applicant.id));
  const queries = [];

  applicants.forEach((applicantId) => {
    queries.push({
      query: 'DELETE FROM applicant_admission_subjects WHERE applicant_id = ?',
      params: [applicantId]
    });
    normalizedSubjects.forEach((subjectId) => {
      queries.push({
        query: `
          INSERT INTO applicant_admission_subjects (applicant_id, subject_id, assigned_by)
          VALUES (?, ?, ?)
        `,
        params: [applicantId, subjectId, assignedBy]
      });
    });
  });

  if (queries.length > 0) await executeTransaction(queries);

  return {
    applicant_count: applicants.length,
    skipped_count: requestedApplicants.length - applicants.length,
    subject_count: normalizedSubjects.length
  };
};

const getAdmissionSubjectAssignments = async ({ examDateId = null } = {}) => {
  await ensureApplicantAdmissionSubjectsTable();
  const params = [];
  let scheduleFilter = '';
  if (examDateId) {
    scheduleFilter = 'AND a.exam_date_id = ?';
    params.push(Number(examDateId));
  }

  const { rows } = await executeQuery(
    `
    SELECT
      a.id as applicant_id,
      a.application_number,
      a.first_name,
      a.last_name,
      a.email,
      a.status,
      a.payment_status,
      a.exam_date_id,
      ed.exam_title,
      ed.exam_date,
      ed.exam_time,
      COUNT(aas.subject_id) as assigned_count,
      GROUP_CONCAT(aas.subject_id ORDER BY sub.subject_name SEPARATOR ',') as assigned_subject_ids,
      GROUP_CONCAT(sub.subject_name ORDER BY sub.subject_name SEPARATOR ', ') as assigned_subject_names
    FROM applicants a
    LEFT JOIN entry_dates ed ON ed.id = a.exam_date_id
    LEFT JOIN applicant_admission_subjects aas ON aas.applicant_id = a.id
    LEFT JOIN admission_subjects sub ON sub.id = aas.subject_id AND sub.is_active = TRUE
    WHERE a.payment_status = 'paid'
      AND a.status = 'approved'
      ${scheduleFilter}
    GROUP BY a.id, ed.id
    ORDER BY ed.exam_date ASC, a.created_at DESC
    `,
    params
  );

  return rows.map((row) => ({
    ...row,
    assigned_subject_ids: row.assigned_subject_ids
      ? row.assigned_subject_ids.split(',').map((id) => Number(id)).filter(Boolean)
      : [],
    assigned_subject_names: row.assigned_subject_names
      ? row.assigned_subject_names.split(', ').filter(Boolean)
      : []
  }));
};

const upsertApplicantScores = async ({ applicantId, scores, enteredBy }) => {
  await ensureApplicantAdmissionSubjectsTable();
  await ensureApplicantIsExamEligible(applicantId);
  const queries = scores.map((score) => ({
    query: `
      INSERT INTO applicant_admission_subjects (applicant_id, subject_id, assigned_by)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by), updated_at = NOW()
    `,
    params: [applicantId, score.subject_id, enteredBy]
  }));

  scores.forEach((score) => {
    queries.push({
      query: `
      INSERT INTO applicant_subject_scores (applicant_id, subject_id, score, entered_by)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE score = VALUES(score), entered_by = VALUES(entered_by), updated_at = NOW()
    `,
      params: [applicantId, score.subject_id, score.score, enteredBy]
    });
  });

  await executeTransaction(queries);
};

const calculateApplicantResult = async (applicantId, benchmarkScore) => {
  await ensureApplicantIsExamEligible(applicantId);
  const query = `
    SELECT 
      COALESCE(SUM(score), 0) AS total_score,
      COALESCE(AVG(score), 0) AS average_score
    FROM applicant_subject_scores score
    JOIN applicant_admission_subjects assigned
      ON assigned.applicant_id = score.applicant_id AND assigned.subject_id = score.subject_id
    WHERE score.applicant_id = ?
  `;
  const { rows } = await executeQuery(query, [applicantId]);
  const total = Number(rows[0]?.total_score || 0);
  const avg = Number(rows[0]?.average_score || 0);
  const isSuccessful = total >= Number(benchmarkScore);

  await executeQuery(
    `
    INSERT INTO admission_results (applicant_id, total_score, average_score, benchmark_score, is_successful)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      total_score = VALUES(total_score),
      average_score = VALUES(average_score),
      benchmark_score = VALUES(benchmark_score),
      is_successful = VALUES(is_successful),
      updated_at = NOW()
    `,
    [applicantId, total, avg, benchmarkScore, isSuccessful]
  );

  return { total_score: total, average_score: avg, benchmark_score: Number(benchmarkScore), is_successful: isSuccessful };
};

const getApplicantResult = async (applicantId) => {
  const { rows } = await executeQuery(
    `
    SELECT 
      ar.*,
      a.application_number,
      a.first_name,
      a.last_name,
      a.email,
      a.phone
    FROM admission_results ar
    JOIN applicants a ON a.id = ar.applicant_id
    WHERE ar.applicant_id = ?
    `,
    [applicantId]
  );

  const result = rows[0] || null;
  if (!result) return null;

  const { rows: scoreRows } = await executeQuery(
    `
    SELECT 
      s.subject_id,
      s.score,
      sub.subject_name,
      sub.max_score
    FROM applicant_admission_subjects assigned
    JOIN admission_subjects sub ON sub.id = assigned.subject_id
    LEFT JOIN applicant_subject_scores s
      ON s.applicant_id = assigned.applicant_id AND s.subject_id = assigned.subject_id
    WHERE assigned.applicant_id = ?
    ORDER BY sub.subject_name ASC
    `,
    [applicantId]
  );

  return { ...result, subjects: scoreRows };
};

const getSubjectByName = async (subjectName) => {
  const { rows } = await executeQuery(
    'SELECT * FROM admission_subjects WHERE LOWER(subject_name) = LOWER(?) LIMIT 1',
    [subjectName]
  );
  return rows[0] || null;
};

const findApplicantByApplicationNumberForAdmission = async (applicationNumber) => {
  const { rows } = await executeQuery(
    'SELECT id FROM applicants WHERE application_number = ? LIMIT 1',
    [applicationNumber]
  );
  return rows[0] || null;
};

const getAdmissionScoreExportRows = async () => {
  await ensureApplicantAdmissionSubjectsTable();
  const { rows } = await executeQuery(
    `
    SELECT
      a.id as applicant_id,
      a.application_number,
      CONCAT(a.first_name, ' ', a.last_name) as candidate_name,
      a.email,
      sub.id as subject_id,
      sub.subject_name,
      sub.max_score,
      COALESCE(score.score, '') as score
    FROM applicant_admission_subjects assigned
    JOIN applicants a ON a.id = assigned.applicant_id
    JOIN admission_subjects sub ON sub.id = assigned.subject_id
    LEFT JOIN applicant_subject_scores score
      ON score.applicant_id = assigned.applicant_id AND score.subject_id = assigned.subject_id
    WHERE a.payment_status = 'paid' AND a.status = 'approved'
    ORDER BY a.application_number ASC, sub.subject_name ASC
    `
  );
  return rows;
};

const getAdmissionScoreSheet = async ({ examDateId }) => {
  await ensureApplicantAdmissionSubjectsTable();
  const { rows } = await executeQuery(
    `
    SELECT
      a.id as applicant_id,
      a.application_number,
      a.first_name,
      a.last_name,
      a.email,
      a.status,
      a.payment_status,
      a.exam_date_id,
      sub.id as subject_id,
      sub.subject_name,
      sub.max_score,
      COALESCE(score.score, '') as score,
      ar.total_score,
      ar.average_score,
      ar.benchmark_score,
      ar.is_successful
    FROM applicants a
    JOIN applicant_admission_subjects assigned ON assigned.applicant_id = a.id
    JOIN admission_subjects sub ON sub.id = assigned.subject_id AND sub.is_active = TRUE
    LEFT JOIN applicant_subject_scores score
      ON score.applicant_id = assigned.applicant_id AND score.subject_id = assigned.subject_id
    LEFT JOIN admission_results ar ON ar.applicant_id = a.id
    WHERE a.exam_date_id = ?
      AND a.payment_status = 'paid'
      AND a.status = 'approved'
    ORDER BY a.application_number ASC, sub.subject_name ASC
    `,
    [Number(examDateId)]
  );

  const applicants = new Map();
  rows.forEach((row) => {
    if (!applicants.has(row.applicant_id)) {
      applicants.set(row.applicant_id, {
        applicant_id: row.applicant_id,
        application_number: row.application_number,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        status: row.status,
        payment_status: row.payment_status,
        exam_date_id: row.exam_date_id,
        total_score: row.total_score,
        average_score: row.average_score,
        benchmark_score: row.benchmark_score,
        is_successful: row.is_successful,
        subjects: []
      });
    }

    applicants.get(row.applicant_id).subjects.push({
      subject_id: row.subject_id,
      subject_name: row.subject_name,
      max_score: row.max_score,
      score: row.score
    });
  });

  return Array.from(applicants.values());
};

const getMyAdmissionResults = async (userId) => {
  const { rows } = await executeQuery(
    `
    SELECT
      ar.*,
      a.id as applicant_id,
      a.application_number,
      a.first_name,
      a.last_name,
      a.email,
      a.status as application_status,
      a.payment_status,
      sch.display_name as schema_display_name,
      sch.schema_name
    FROM admission_results ar
    JOIN applicants a ON a.id = ar.applicant_id
    LEFT JOIN application_schemas sch ON sch.id = a.schema_id
    WHERE a.user_id = ?
      AND a.payment_status = 'paid'
      AND a.status = 'approved'
    ORDER BY ar.updated_at DESC
    `,
    [userId]
  );

  const results = [];
  for (const row of rows) {
    results.push({
      ...row,
      subjects: await getApplicantAssignedSubjects(row.applicant_id)
    });
  }
  return results;
};

const listSuccessfulCandidates = async () => {
  const { rows } = await executeQuery(
    `
    SELECT 
      ar.*,
      a.application_number,
      a.first_name,
      a.last_name,
      a.email
    FROM admission_results ar
    JOIN applicants a ON a.id = ar.applicant_id
    WHERE ar.is_successful = TRUE
      AND a.payment_status = 'paid'
      AND a.status = 'approved'
    ORDER BY ar.total_score DESC, a.last_name ASC
    `
  );
  return rows;
};

const updateAdmissionDecision = async ({ applicantId, status, notes, decidedBy }) => {
  await executeQuery(
    `
    INSERT INTO admission_results (applicant_id, admission_status, decision_notes, decided_by, decided_at)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      admission_status = VALUES(admission_status),
      decision_notes = VALUES(decision_notes),
      decided_by = VALUES(decided_by),
      decided_at = VALUES(decided_at),
      updated_at = NOW()
    `,
    [applicantId, status, notes || null, decidedBy]
  );
};

const saveAdmissionLetterMeta = async ({ applicantId, letterRef, payload }) => {
  await executeQuery(
    `
    INSERT INTO admission_results (applicant_id, letter_ref, letter_payload, letter_generated_at)
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      letter_ref = VALUES(letter_ref),
      letter_payload = VALUES(letter_payload),
      letter_generated_at = VALUES(letter_generated_at),
      updated_at = NOW()
    `,
    [applicantId, letterRef, JSON.stringify(payload || {})]
  );
};

const markAdmissionLetterSent = async (applicantId) => {
  await executeQuery(
    'UPDATE admission_results SET letter_sent = TRUE, letter_sent_at = NOW(), updated_at = NOW() WHERE applicant_id = ?',
    [applicantId]
  );
};

module.exports = {
  getAdmissionSettings,
  updateAdmissionBenchmark,
  getAdmissionSubjects,
  createAdmissionSubject,
  updateAdmissionSubject,
  getApplicantAssignedSubjects,
  assignApplicantSubjects,
  assignSubjectsByExamDate,
  assignSubjectsToApplicants,
  getAdmissionSubjectAssignments,
  upsertApplicantScores,
  calculateApplicantResult,
  getApplicantResult,
  getSubjectByName,
  findApplicantByApplicationNumberForAdmission,
  getAdmissionScoreExportRows,
  getAdmissionScoreSheet,
  getMyAdmissionResults,
  listSuccessfulCandidates,
  updateAdmissionDecision,
  saveAdmissionLetterMeta,
  markAdmissionLetterSent
};
