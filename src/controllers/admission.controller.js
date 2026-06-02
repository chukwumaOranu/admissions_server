const { findApplicantById } = require('../models/applicant.model');
const { findSchoolSettings } = require('../models/settings-upload.model');
const { getActiveTemplate } = require('../models/documentTemplate.model');
const {
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
} = require('../models/admission.model');
const { generateAdmissionLetterPDF } = require('../utils/admissionLetterGenerator');
const emailService = require('../utils/emailService');
const csv = require('csv-parser');
const fs = require('fs');

const generateLetterRef = (applicationNumber) => {
  const ts = Date.now().toString().slice(-6);
  return `ADM-${applicationNumber || 'APP'}-${ts}`;
};

const canReleaseAdmissionLetter = (result) => (
  Boolean(result?.is_successful) && result?.admission_status === 'approved'
);

const getAdmissionSubjectsController = async (req, res) => {
  try {
    const subjects = await getAdmissionSubjects();
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAdmissionSubjectController = async (req, res) => {
  try {
    const { subject_name, max_score } = req.body;
    if (!subject_name) {
      return res.status(400).json({ success: false, message: 'subject_name is required' });
    }
    const subject = await createAdmissionSubject({
      subject_name,
      max_score: Number(max_score || 100),
      created_by: req.user.id
    });
    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAdmissionSubjectController = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await updateAdmissionSubject(id, req.body);
    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getApplicantSubjectsController = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const subjects = await getApplicantAssignedSubjects(Number(applicantId));
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const assignApplicantSubjectsController = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const { subject_ids } = req.body;
    if (!Array.isArray(subject_ids)) {
      return res.status(400).json({ success: false, message: 'subject_ids array is required' });
    }

    const subjects = await assignApplicantSubjects({
      applicantId: Number(applicantId),
      subjectIds: subject_ids,
      assignedBy: req.user.id
    });

    res.status(200).json({ success: true, message: 'Applicant subjects assigned', data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const assignExamDateSubjectsController = async (req, res) => {
  try {
    const { examDateId } = req.params;
    const { subject_ids } = req.body;
    if (!Array.isArray(subject_ids) || subject_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'subject_ids array is required' });
    }

    const result = await assignSubjectsByExamDate({
      examDateId: Number(examDateId),
      subjectIds: subject_ids,
      assignedBy: req.user.id
    });

    res.status(200).json({ success: true, message: 'Subjects assigned to exam schedule applicants', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const assignSelectedApplicantsSubjectsController = async (req, res) => {
  try {
    const { applicant_ids, subject_ids } = req.body;
    if (!Array.isArray(applicant_ids) || applicant_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'applicant_ids array is required' });
    }
    if (!Array.isArray(subject_ids) || subject_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'subject_ids array is required' });
    }

    const result = await assignSubjectsToApplicants({
      applicantIds: applicant_ids,
      subjectIds: subject_ids,
      assignedBy: req.user.id
    });

    res.status(200).json({ success: true, message: 'Subjects assigned to selected applicants', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSubjectAssignmentsController = async (req, res) => {
  try {
    const assignments = await getAdmissionSubjectAssignments({
      examDateId: req.query.exam_date_id || null
    });
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBenchmarkController = async (req, res) => {
  try {
    const settings = await getAdmissionSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBenchmarkController = async (req, res) => {
  try {
    const { benchmark_score } = req.body;
    if (benchmark_score === undefined || Number.isNaN(Number(benchmark_score))) {
      return res.status(400).json({ success: false, message: 'benchmark_score must be a number' });
    }
    const settings = await updateAdmissionBenchmark(Number(benchmark_score), req.user.id);
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const upsertApplicantScoresController = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const { scores } = req.body;
    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ success: false, message: 'scores array is required' });
    }

    await upsertApplicantScores({
      applicantId: Number(applicantId),
      scores: scores.map((score) => ({
        subject_id: Number(score.subject_id),
        score: Number(score.score || 0)
      })),
      enteredBy: req.user.id
    });

    const settings = await getAdmissionSettings();
    const result = await calculateApplicantResult(Number(applicantId), settings?.benchmark_score || 180);

    res.status(200).json({
      success: true,
      message: 'Scores saved and result aggregated',
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const csvEscape = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const exportScoresCsvController = async (req, res) => {
  try {
    const rows = await getAdmissionScoreExportRows();
    const header = ['applicant_id', 'application_number', 'candidate_name', 'email', 'subject_id', 'subject_name', 'max_score', 'score'];
    const csvRows = [
      header.join(','),
      ...rows.map((row) => header.map((key) => csvEscape(row[key])).join(','))
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="admission_scores.csv"');
    res.send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getScoreSheetController = async (req, res) => {
  try {
    const { exam_date_id } = req.query;
    if (!exam_date_id) {
      return res.status(400).json({ success: false, message: 'exam_date_id is required' });
    }

    const rows = await getAdmissionScoreSheet({ examDateId: exam_date_id });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const upsertBulkScoresController = async (req, res) => {
  try {
    const { applicants } = req.body;
    if (!Array.isArray(applicants) || applicants.length === 0) {
      return res.status(400).json({ success: false, message: 'applicants array is required' });
    }

    const settings = await getAdmissionSettings();
    const results = [];
    for (const applicant of applicants) {
      const applicantId = Number(applicant.applicant_id);
      const scores = (applicant.scores || []).map((score) => ({
        subject_id: Number(score.subject_id),
        score: Number(score.score || 0)
      }));
      if (!applicantId || scores.length === 0) continue;

      await upsertApplicantScores({
        applicantId,
        scores,
        enteredBy: req.user.id
      });
      const result = await calculateApplicantResult(applicantId, settings?.benchmark_score || 180);
      results.push({ applicant_id: applicantId, ...result });
    }

    res.status(200).json({
      success: true,
      message: 'Bulk scores saved',
      data: {
        updatedApplicants: results.length,
        results
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const importScoresCsvController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'CSV file is required' });
    }

    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    const grouped = new Map();
    const errors = [];

    for (const [index, row] of rows.entries()) {
      try {
        let applicantId = Number(row.applicant_id || row.applicantId || 0);
        if (!applicantId && row.application_number) {
          const applicant = await findApplicantByApplicationNumberForAdmission(row.application_number);
          applicantId = Number(applicant?.id || 0);
        }
        if (!applicantId) throw new Error('Missing applicant_id or application_number');

        let subjectId = Number(row.subject_id || row.subjectId || 0);
        if (!subjectId && row.subject_name) {
          const subject = await getSubjectByName(row.subject_name);
          subjectId = Number(subject?.id || 0);
        }
        if (!subjectId) throw new Error('Missing subject_id or known subject_name');

        const score = Number(row.score);
        if (Number.isNaN(score)) throw new Error('Invalid score');

        if (!grouped.has(applicantId)) grouped.set(applicantId, []);
        grouped.get(applicantId).push({ subject_id: subjectId, score });
      } catch (error) {
        errors.push({ row: index + 2, error: error.message });
      }
    }

    let updatedApplicants = 0;
    const settings = await getAdmissionSettings();
    for (const [applicantId, scores] of grouped.entries()) {
      await upsertApplicantScores({ applicantId, scores, enteredBy: req.user.id });
      await calculateApplicantResult(applicantId, settings?.benchmark_score || 180);
      updatedApplicants += 1;
    }

    fs.unlink(req.file.path, () => {});

    res.status(200).json({
      success: true,
      message: 'Scores imported',
      data: {
        updatedApplicants,
        rows: rows.length,
        errors
      }
    });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, message: error.message });
  }
};

const getApplicantResultController = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const result = await getApplicantResult(Number(applicantId));
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyResultsController = async (req, res) => {
  try {
    const results = await getMyAdmissionResults(req.user.id);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const listSuccessfulCandidatesController = async (req, res) => {
  try {
    const rows = await listSuccessfulCandidates();
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAdmissionDecisionController = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const { admission_status, decision_notes } = req.body;
    const valid = ['pending', 'approved', 'rejected'];
    if (!valid.includes(admission_status)) {
      return res.status(400).json({ success: false, message: 'Invalid admission_status' });
    }

    await updateAdmissionDecision({
      applicantId: Number(applicantId),
      status: admission_status,
      notes: decision_notes,
      decidedBy: req.user.id
    });

    res.status(200).json({ success: true, message: 'Admission decision updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const generateAdmissionLetterController = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const applicant = await findApplicantById(Number(applicantId));
    if (!applicant) {
      return res.status(404).json({ success: false, message: 'Applicant not found' });
    }

    const result = await getApplicantResult(Number(applicantId));
    if (!canReleaseAdmissionLetter(result)) {
      return res.status(403).json({ success: false, message: 'Admission letter requires approval before download' });
    }

    const schoolSettings = await findSchoolSettings();
    const activeTemplate = await getActiveTemplate('admission_letter');
    const letterRef = generateLetterRef(applicant.application_number);
    const issuedAt = new Date().toISOString();
    const pdf = await generateAdmissionLetterPDF({
      applicant,
      schoolSettings: schoolSettings || {},
      letterRef,
      issuedAt,
      template: activeTemplate
    });

    await saveAdmissionLetterMeta({
      applicantId: Number(applicantId),
      letterRef,
      payload: { issuedAt, applicantId: Number(applicantId) }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="admission_letter_${applicant.application_number || applicant.id}.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const generateMyAdmissionLetterController = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const applicant = await findApplicantById(Number(applicantId));
    if (!applicant || Number(applicant.user_id) !== Number(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Admission letter not found' });
    }

    const result = await getApplicantResult(Number(applicantId));
    if (!canReleaseAdmissionLetter(result)) {
      return res.status(403).json({ success: false, message: 'Admission letter is not available for this application' });
    }

    const schoolSettings = await findSchoolSettings();
    const activeTemplate = await getActiveTemplate('admission_letter');
    const letterRef = result.letter_ref || generateLetterRef(applicant.application_number);
    const issuedAt = new Date().toISOString();
    const pdf = await generateAdmissionLetterPDF({
      applicant,
      schoolSettings: schoolSettings || {},
      letterRef,
      issuedAt,
      template: activeTemplate
    });

    await saveAdmissionLetterMeta({
      applicantId: Number(applicantId),
      letterRef,
      payload: { issuedAt, applicantId: Number(applicantId), downloadedBy: req.user.id }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="admission_letter_${applicant.application_number || applicant.id}.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const sendAdmissionLettersController = async (req, res) => {
  try {
    const { applicant_ids } = req.body;
    if (!Array.isArray(applicant_ids) || applicant_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'applicant_ids array is required' });
    }

    await emailService.initialize();
    const schoolSettings = await findSchoolSettings();
    const activeTemplate = await getActiveTemplate('admission_letter');
    const results = [];

    for (const applicantId of applicant_ids) {
      try {
        const applicant = await findApplicantById(Number(applicantId));
        if (!applicant) {
          results.push({ applicant_id: applicantId, success: false, error: 'Applicant not found' });
          continue;
        }

        const result = await getApplicantResult(Number(applicantId));
        if (!canReleaseAdmissionLetter(result)) {
          results.push({ applicant_id: applicantId, success: false, error: 'Admission letter requires approval before sending' });
          continue;
        }

        const letterRef = generateLetterRef(applicant.application_number);
        const issuedAt = new Date().toISOString();
        const pdf = await generateAdmissionLetterPDF({
          applicant,
          schoolSettings: schoolSettings || {},
          letterRef,
          issuedAt,
          template: activeTemplate
        });

        const mail = await emailService.sendAdmissionLetterEmail({
          applicant,
          letterPdfBuffer: pdf,
          letterRef
        });

        if (!mail.success) {
          results.push({ applicant_id: applicantId, success: false, error: mail.error || mail.message });
          continue;
        }

        await saveAdmissionLetterMeta({
          applicantId: Number(applicantId),
          letterRef,
          payload: { issuedAt, sentBy: req.user.id }
        });
        await markAdmissionLetterSent(Number(applicantId));

        results.push({ applicant_id: applicantId, success: true });
      } catch (error) {
        results.push({ applicant_id: applicantId, success: false, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdmissionSubjectsController,
  createAdmissionSubjectController,
  updateAdmissionSubjectController,
  getApplicantSubjectsController,
  assignApplicantSubjectsController,
  assignExamDateSubjectsController,
  assignSelectedApplicantsSubjectsController,
  getSubjectAssignmentsController,
  getBenchmarkController,
  updateBenchmarkController,
  upsertApplicantScoresController,
  getScoreSheetController,
  upsertBulkScoresController,
  exportScoresCsvController,
  importScoresCsvController,
  getApplicantResultController,
  getMyResultsController,
  listSuccessfulCandidatesController,
  updateAdmissionDecisionController,
  generateAdmissionLetterController,
  generateMyAdmissionLetterController,
  sendAdmissionLettersController
};
