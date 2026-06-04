const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { findEmailSettings } = require('../models/settings-upload.model');
const { findSchoolSettings } = require('../models/settings-upload.model');

/**
 * Email Service Utility
 * Handles all email sending functionality using nodemailer and email settings
 */

let transporter = null;
let settings = null;

const envBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const trimSetting = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim();
};

const normalizeEmailSettings = (emailSettings) => {
  if (!emailSettings) return emailSettings;

  return {
    ...emailSettings,
    smtp_host: trimSetting(emailSettings.smtp_host),
    smtp_username: trimSetting(emailSettings.smtp_username),
    smtp_password: trimSetting(emailSettings.smtp_password),
    from_name: trimSetting(emailSettings.from_name),
    from_email: trimSetting(emailSettings.from_email),
    reply_to_email: trimSetting(emailSettings.reply_to_email)
  };
};

const getSettingSource = (key, envSettings, dbSettings) => {
  if (envSettings && envSettings[key] !== undefined && envSettings[key] !== null && envSettings[key] !== '') {
    return 'env';
  }
  if (dbSettings && dbSettings[key] !== undefined && dbSettings[key] !== null && dbSettings[key] !== '') {
    return 'database';
  }
  return 'missing';
};

const getSecretFingerprint = (value) => {
  if (typeof value !== 'string') {
    return {
      length: 0,
      sha256Prefix: null,
      startsWithQuote: false,
      endsWithQuote: false,
      hasControlChars: false,
      hasZeroWidthChars: false,
      hasNonAsciiChars: false
    };
  }

  return {
    length: value.length,
    sha256Prefix: crypto.createHash('sha256').update(value).digest('hex').slice(0, 12),
    startsWithQuote: ['"', "'"].includes(value[0]),
    endsWithQuote: ['"', "'"].includes(value[value.length - 1]),
    hasControlChars: /[\u0000-\u001F\u007F]/.test(value),
    hasZeroWidthChars: /[\u200B-\u200D\uFEFF]/.test(value),
    hasNonAsciiChars: /[^\x00-\x7F]/.test(value)
  };
};

const buildEnvEmailSettings = () => {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  return {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: Number(process.env.SMTP_PORT || 587),
    smtp_secure: envBool(process.env.SMTP_SECURE, Number(process.env.SMTP_PORT) === 465),
    smtp_username: process.env.EMAIL_USER,
    smtp_password: process.env.EMAIL_PASS,
    from_name: process.env.EMAIL_FROM_NAME || process.env.FROM_NAME || 'Admissions',
    from_email: process.env.EMAIL_FROM || process.env.FROM_EMAIL || process.env.EMAIL_USER,
    reply_to_email: process.env.REPLY_TO_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER,
    welcome_email_enabled: envBool(process.env.WELCOME_EMAIL_ENABLED, true),
    notification_email_enabled: envBool(process.env.NOTIFICATION_EMAIL_ENABLED, true),
    email_templates: {}
  };
};

/**
 * Get school name from settings
 */
const getSchoolName = async () => {
  try {
    const schoolSettings = await findSchoolSettings();
    return schoolSettings?.school_name || 'DeepFlux Academy';
  } catch (error) {
    console.warn('⚠️ Failed to fetch school name, using default:', error.message);
    return 'DeepFlux Academy';
  }
};

/**
 * Initialize email service with settings from database
 */
const initialize = async () => {
  try {
    const dbSettings = await findEmailSettings().catch((error) => {
      console.warn('⚠️ Failed to load database email settings:', error.message);
      return null;
    });
    const envSettings = buildEnvEmailSettings();
    const mergedSettings = {
      ...(dbSettings || {}),
      ...(envSettings || {})
    };
    const passwordHadOuterWhitespace =
      typeof mergedSettings.smtp_password === 'string' &&
      mergedSettings.smtp_password !== mergedSettings.smtp_password.trim();

    settings = normalizeEmailSettings(mergedSettings);
    const passwordFingerprint = getSecretFingerprint(settings.smtp_password);
    const settingSources = {
      host: getSettingSource('smtp_host', envSettings, dbSettings),
      port: getSettingSource('smtp_port', envSettings, dbSettings),
      secure: getSettingSource('smtp_secure', envSettings, dbSettings),
      user: getSettingSource('smtp_username', envSettings, dbSettings),
      password: getSettingSource('smtp_password', envSettings, dbSettings)
    };
    
    if (!settings || Object.keys(settings).length === 0) {
      console.warn('⚠️ No email settings found. Provide SMTP_HOST, SMTP_PORT, SMTP_SECURE, EMAIL_USER, and EMAIL_PASS.');
      return false;
    }

    // Validate required settings
    if (!settings.smtp_host || !settings.smtp_username || !settings.smtp_password) {
      console.warn('⚠️ Incomplete email settings. Required: SMTP_HOST, EMAIL_USER, EMAIL_PASS.');
      return false;
    }

    console.log('📧 Initializing email service:', {
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: !!settings.smtp_secure,
      user: settings.smtp_username,
      passwordLength: settings.smtp_password?.length,
      passwordHadOuterWhitespace,
      passwordFingerprint,
      settingSources
    });

    // Create transporter
    transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: settings.smtp_secure || false,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
      auth: {
        user: settings.smtp_username,
        pass: settings.smtp_password
      }
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error.message);
    return false;
  }
};

/**
 * Send welcome email to new employee
 */
const sendWelcomeEmailToEmployee = async (employeeData, credentials) => {
  try {
    if (!transporter || !settings.welcome_email_enabled) {
      console.log('📧 Welcome email disabled or service not available');
      return { success: false, message: 'Email service not available' };
    }

    const { email, first_name, last_name, employee_id } = employeeData;
    const { username, password } = credentials;

    const emailTemplates = settings.email_templates || {};
    const welcomeTemplate = emailTemplates.employee_welcome || getDefaultEmployeeWelcomeTemplate(await getSchoolName());

    const htmlContent = renderTemplate(welcomeTemplate, {
      firstName: first_name,
      lastName: last_name,
      fullName: `${first_name} ${last_name}`,
      employeeId: employee_id,
      username: username,
      password: password,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      schoolName: await getSchoolName()
    });

    const mailOptions = {
      from: `"${settings.from_name || 'DeepFlux Academy'}" <${settings.from_email}>`,
      to: email,
      replyTo: settings.reply_to_email || settings.from_email,
      subject: `Welcome to ${settings.from_name || 'DeepFlux Academy'} - Your Account Details`,
      html: htmlContent,
      text: htmlToText(htmlContent)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to employee:', email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send welcome email to employee:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email to new student
 */
const sendWelcomeEmailToStudent = async (studentData, credentials) => {
  try {
    if (!transporter || !settings.welcome_email_enabled) {
      console.log('📧 Welcome email disabled or service not available');
      return { success: false, message: 'Email service not available' };
    }

    const { email, first_name, last_name, student_id } = studentData;
    const { username, password } = credentials;

    const emailTemplates = settings.email_templates || {};
    const welcomeTemplate = emailTemplates.student_welcome || getDefaultStudentWelcomeTemplate(await getSchoolName());

    const htmlContent = renderTemplate(welcomeTemplate, {
      firstName: first_name,
      lastName: last_name,
      fullName: `${first_name} ${last_name}`,
      studentId: student_id,
      username: username,
      password: password,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      schoolName: await getSchoolName()
    });

    const mailOptions = {
      from: `"${settings.from_name || 'DeepFlux Academy'}" <${settings.from_email}>`,
      to: email,
      replyTo: settings.reply_to_email || settings.from_email,
      subject: `Welcome to ${settings.from_name || 'DeepFlux Academy'} - Your Student Account`,
      html: htmlContent,
      text: htmlToText(htmlContent)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to student:', email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send welcome email to student:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send registration confirmation email
 */
const sendRegistrationConfirmation = async (studentData) => {
  try {
    if (!transporter || !settings.notification_email_enabled) {
      console.log('📧 Registration confirmation email disabled or service not available');
      return { success: false, message: 'Email service not available' };
    }

    const { email, first_name, last_name, student_id } = studentData;

    const emailTemplates = settings.email_templates || {};
    const confirmationTemplate = emailTemplates.registration_confirmation || getDefaultRegistrationConfirmationTemplate(await getSchoolName());

    const htmlContent = renderTemplate(confirmationTemplate, {
      firstName: first_name,
      lastName: last_name,
      fullName: `${first_name} ${last_name}`,
      studentId: student_id,
      schoolName: await getSchoolName(),
      applicationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/student-portal`
    });

    const mailOptions = {
      from: `"${settings.from_name || 'DeepFlux Academy'}" <${settings.from_email}>`,
      to: email,
      replyTo: settings.reply_to_email || settings.from_email,
      subject: `Registration Confirmation - ${settings.from_name || 'DeepFlux Academy'}`,
      html: htmlContent,
      text: htmlToText(htmlContent)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Registration confirmation email sent to:', email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send registration confirmation:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send application approval email
 */
const sendApplicationApprovalEmail = async (applicationData) => {
  try {
    if (!transporter || !settings.notification_email_enabled) {
      console.log('📧 Application approval email disabled or service not available');
      return { success: false, message: 'Email service not available' };
    }

    const schoolName = await getSchoolName();
    const { email, first_name, last_name, application_number, schema_display_name, username, password } = applicationData;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim() || 'Applicant';
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    const credentialsBlock = username
      ? `
          <div style="background: #fff7ed; border-left: 4px solid #c2410c; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>Login URL:</strong> <a href="${loginUrl}" style="color: #123b63;">${loginUrl}</a></p>
            <p style="margin: 0 0 8px;"><strong>Username:</strong> ${username}</p>
            <p style="margin: 0;"><strong>Password:</strong> ${password || 'Use the password previously sent to you, or contact admissions to reset it.'}</p>
          </div>
        `
      : `
          <div style="background: #fff7ed; border-left: 4px solid #c2410c; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>Login URL:</strong> <a href="${loginUrl}" style="color: #123b63;">${loginUrl}</a></p>
            <p style="margin: 0;">Your login details are being prepared. Please contact admissions if you have not received them.</p>
          </div>
        `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px; color: #172033;">
        <div style="background: #123b63; color: white; padding: 28px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Application Approved</h1>
          <p style="margin: 8px 0 0; color: #dbe7f5;">${schoolName} Admissions</p>
        </div>
        <div style="border: 1px solid #d7dde8; border-top: 0; padding: 28px; border-radius: 0 0 10px 10px; background: #ffffff;">
          <p>Hello ${fullName},</p>
          <p>Your application has been reviewed and approved. You are now eligible to select an exam date and proceed with the examination stage.</p>
          <div style="background: #f8fafc; border-left: 4px solid #0f8a5f; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>Application Number:</strong> ${application_number || 'N/A'}</p>
            <p style="margin: 0;"><strong>Program/Form:</strong> ${schema_display_name || 'N/A'}</p>
          </div>
          <p>Please login to your student dashboard to continue your application, select your exam date, view exam information, and download your exam card when available.</p>
          ${credentialsBlock}
          <p style="text-align: center; margin: 28px 0;">
            <a href="${loginUrl}" style="background: #123b63; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Dashboard</a>
          </p>
          <p style="color: #b45309; font-size: 13px;">For security, please change your password after your first login.</p>
          <p style="color: #64748b; font-size: 13px;">If you have questions, please contact the admissions office.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${settings.from_name || schoolName}" <${settings.from_email}>`,
      to: email,
      replyTo: settings.reply_to_email || settings.from_email,
      subject: `Application Approved - ${application_number || schoolName}`,
      html: htmlContent,
      text: htmlToText(htmlContent)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Application approval email sent to:', email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send application approval email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send public student registration acknowledgement email
 */
const sendPublicRegistrationReceivedEmail = async (studentData) => {
  try {
    if (!transporter || !settings.notification_email_enabled) {
      console.log('📧 Public registration acknowledgement email disabled or service not available');
      return { success: false, message: 'Email service not available' };
    }

    const schoolName = await getSchoolName();
    const { email, first_name, last_name, student_id, schema_display_name } = studentData;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim() || 'Applicant';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px; color: #172033;">
        <div style="background: #123b63; color: white; padding: 28px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Registration Received</h1>
          <p style="margin: 8px 0 0; color: #dbe7f5;">${schoolName} Admissions</p>
        </div>
        <div style="border: 1px solid #d7dde8; border-top: 0; padding: 28px; border-radius: 0 0 10px 10px; background: #ffffff;">
          <p>Hello ${fullName},</p>
          <p>We have received your student registration. The admissions office will review your details and contact you with the next steps.</p>
          <div style="background: #f8fafc; border-left: 4px solid #123b63; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>Reference:</strong> ${student_id || 'N/A'}</p>
            <p style="margin: 0;"><strong>Category:</strong> ${schema_display_name || 'N/A'}</p>
          </div>
          <p>Please do not worry if you cannot login yet. Portal access will be communicated after review.</p>
          <p style="color: #64748b; font-size: 13px;">If you did not submit this registration, please contact the school immediately.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${settings.from_name || schoolName}" <${settings.from_email}>`,
      to: email,
      replyTo: settings.reply_to_email || settings.from_email,
      subject: `Registration Received - ${student_id || schoolName}`,
      html: htmlContent,
      text: htmlToText(htmlContent)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Public registration acknowledgement email sent to:', email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send public registration acknowledgement email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send exam card email to student
 */
const sendExamCardEmail = async (studentData, examCardAttachment = null) => {
  try {
    if (!transporter || !settings.notification_email_enabled) {
      console.log('📧 Exam card email disabled or service not available');
      return { success: false, message: 'Email service not available' };
    }

    const { email, first_name, last_name } = studentData;
    const { exam_date, exam_time, exam_venue, exam_title, application_id } = studentData;

    const schoolName = await getSchoolName();

    // Create email template
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Exam Card Generated!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${schoolName}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${first_name}!</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Your exam card has been successfully generated. Please find your exam details below.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="color: #333; margin-top: 0;">Exam Details</h3>
          ${exam_title ? `<p><strong>Exam:</strong> ${exam_title}</p>` : ''}
          <p><strong>Date:</strong> ${new Date(exam_date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${exam_time}</p>
          <p><strong>Venue:</strong> ${exam_venue}</p>
          <p><strong>Application ID:</strong> ${application_id}</p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #ffc107;">
          <h4 style="color: #856404; margin-top: 0;">⚠️ Important Instructions:</h4>
          <ul style="color: #555; margin: 0;">
            <li>Bring your printed exam card to the examination venue</li>
            <li>Arrive at least 30 minutes before the exam start time</li>
            <li>Bring valid identification (school ID or government-issued ID)</li>
            <li>Do not forget any required materials or tools</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions about the examination, please contact the examination office.
        </p>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #999; font-size: 12px;">
            This email was sent from ${schoolName} examination system.
          </p>
        </div>
      </div>
    </div>
    `;

    const mailOptions = {
      from: `"${settings.from_name || schoolName}" <${settings.from_email}>`,
      to: email,
      replyTo: settings.reply_to_email || settings.from_email,
      subject: `Exam Card Generated - ${schoolName}`,
      html: htmlContent,
      text: htmlToText(htmlContent)
    };

    // Attach exam card PDF if provided
    if (examCardAttachment) {
      mailOptions.attachments = [{
        filename: `exam_card_${application_id}.pdf`,
        content: examCardAttachment,
        contentType: 'application/pdf'
      }];
    }

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Exam card email sent to:', email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send exam card email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send test email
 */
const sendTestEmail = async (testEmail, testMessage) => {
  try {
    if (!transporter) {
      return { success: false, message: 'Email service not available' };
    }

    const mailOptions = {
      from: `"${settings.from_name || await getSchoolName()}" <${settings.from_email}>`,
      to: testEmail,
      replyTo: settings.reply_to_email || settings.from_email,
      subject: 'Test Email - Email Settings Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email</h2>
          <p>This is a test email to verify your email settings.</p>
          <p><strong>Message:</strong> ${testMessage || 'No message provided'}</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This email was sent from ${settings.from_name || await getSchoolName()} email system.
          </p>
        </div>
      `,
      text: `Test Email\n\nThis is a test email to verify your email settings.\nMessage: ${testMessage || 'No message provided'}\nSent at: ${new Date().toLocaleString()}`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent to:', testEmail);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    return { success: false, error: error.message };
  }
};

const sendStudentLoginDetails = async (studentData, credentials) => {
  try {
    if (!transporter || !settings.welcome_email_enabled) {
      return { success: false, message: 'Email service not available' };
    }

    const schoolName = await getSchoolName();
    const htmlContent = renderTemplate(getDefaultStudentWelcomeTemplate(schoolName), {
      firstName: studentData.first_name,
      lastName: studentData.last_name,
      fullName: `${studentData.first_name} ${studentData.last_name}`,
      studentId: studentData.student_id,
      username: credentials.username,
      password: credentials.password,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      schoolName
    });

    const result = await transporter.sendMail({
      from: `"${settings.from_name || schoolName}" <${settings.from_email}>`,
      to: studentData.email,
      replyTo: settings.reply_to_email || settings.from_email,
      subject: `Student Login Details - ${schoolName}`,
      html: htmlContent,
      text: htmlToText(htmlContent)
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const sendAdmissionLetterEmail = async ({ applicant, letterPdfBuffer, letterRef }) => {
  try {
    if (!transporter || !settings.notification_email_enabled) {
      return { success: false, message: 'Email service not available' };
    }

    const schoolName = await getSchoolName();
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Admission Decision Notification</h2>
        <p>Dear ${applicant.first_name} ${applicant.last_name},</p>
        <p>Congratulations. Your admission letter is attached to this email.</p>
        <p><strong>Reference:</strong> ${letterRef}</p>
        <p>Please login to continue your admission process.</p>
        <p>${schoolName} Admissions Office</p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: `"${settings.from_name || schoolName}" <${settings.from_email}>`,
      to: applicant.email,
      replyTo: settings.reply_to_email || settings.from_email,
      subject: `Admission Letter - ${schoolName}`,
      html: htmlContent,
      text: htmlToText(htmlContent),
      attachments: [
        {
          filename: `admission_letter_${applicant.application_number}.pdf`,
          content: letterPdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Render email template with variables
 */
const renderTemplate = (template, variables) => {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value || '');
  }
  return rendered;
};

/**
 * Convert HTML to plain text
 */
const htmlToText = (html) => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

/**
 * Default employee welcome email template
 */
const getDefaultEmployeeWelcomeTemplate = (schoolName) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to ${schoolName}!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Employee Portal Access</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Hello {{firstName}}!</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Welcome to ${schoolName}! Your employee account has been successfully created. 
          You can now access the employee portal using the credentials below.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="color: #333; margin-top: 0;">Your Account Details</h3>
          <p><strong>Employee ID:</strong> {{employeeId}}</p>
          <p><strong>Full Name:</strong> {{fullName}}</p>
          <p><strong>Username:</strong> {{username}}</p>
          <p><strong>Password:</strong> {{password}}</p>
          <p style="color: #e74c3c; font-size: 14px; margin-top: 15px;">
            ⚠️ <strong>Important:</strong> Please change your password after your first login for security.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{loginUrl}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Access Employee Portal
          </a>
        </div>
        
        <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h4 style="color: #2c5aa0; margin-top: 0;">Next Steps:</h4>
          <ul style="color: #555; margin: 0;">
            <li>Log in to the employee portal using your credentials</li>
            <li>Update your profile information</li>
            <li>Change your password for security</li>
            <li>Explore the available features and tools</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions or need assistance, please contact the IT department.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>This email was sent from ${schoolName} employee management system.</p>
      </div>
    </div>
  `;
};

/**
 * Default student welcome email template
 */
const getDefaultStudentWelcomeTemplate = (schoolName) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to ${schoolName}!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Student Portal Access</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Hello {{firstName}}!</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Welcome to ${schoolName}! Your student account has been successfully created. 
          You can now access the student portal using the credentials below.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="color: #333; margin-top: 0;">Your Account Details</h3>
          <p><strong>Student ID:</strong> {{studentId}}</p>
          <p><strong>Full Name:</strong> {{fullName}}</p>
          <p><strong>Username:</strong> {{username}}</p>
          <p><strong>Password:</strong> {{password}}</p>
          <p style="color: #e74c3c; font-size: 14px; margin-top: 15px;">
            ⚠️ <strong>Important:</strong> Please change your password after your first login for security.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{loginUrl}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Access Student Portal
          </a>
        </div>
        
        <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h4 style="color: #2c5aa0; margin-top: 0;">What You Can Do:</h4>
          <ul style="color: #555; margin: 0;">
            <li>View your academic information</li>
            <li>Check your grades and assignments</li>
            <li>Update your profile and contact information</li>
            <li>Access course materials and resources</li>
            <li>Communicate with teachers and staff</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions or need assistance, please contact the student services office.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>This email was sent from ${schoolName} student management system.</p>
      </div>
    </div>
  `;
};

/**
 * Default registration confirmation email template
 */
const getDefaultRegistrationConfirmationTemplate = (schoolName) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Registration Confirmed!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Welcome to ${schoolName}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Hello {{firstName}}!</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Congratulations! Your registration with ${schoolName} has been successfully completed. 
          We're excited to have you as part of our community.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #333; margin-top: 0;">Registration Details</h3>
          <p><strong>Student ID:</strong> {{studentId}}</p>
          <p><strong>Full Name:</strong> {{fullName}}</p>
          <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Confirmed</span></p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{applicationUrl}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Access Your Application
          </a>
        </div>
        
        <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h4 style="color: #155724; margin-top: 0;">What's Next?</h4>
          <ul style="color: #555; margin: 0;">
            <li>Complete your profile information</li>
            <li>Upload required documents</li>
            <li>Pay any outstanding fees</li>
            <li>Wait for admission decision</li>
            <li>Check your email for updates</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions about your registration or need assistance, 
          please don't hesitate to contact our admissions office.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>This email was sent from ${schoolName} admissions system.</p>
      </div>
    </div>
  `;
};

// Export all functions
module.exports = {
  initialize,
  sendWelcomeEmailToEmployee,
  sendWelcomeEmailToStudent,
  sendRegistrationConfirmation,
  sendApplicationApprovalEmail,
  sendPublicRegistrationReceivedEmail,
  sendExamCardEmail,
  sendStudentLoginDetails,
  sendAdmissionLetterEmail,
  sendTestEmail,
  renderTemplate,
  htmlToText,
  getSchoolName,
  getDefaultEmployeeWelcomeTemplate,
  getDefaultStudentWelcomeTemplate,
  getDefaultRegistrationConfirmationTemplate
};
