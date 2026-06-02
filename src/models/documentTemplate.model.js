const { executeQuery } = require('../configs/db.config');

const listTemplates = async (templateKey) => {
  let query = 'SELECT * FROM document_templates';
  const params = [];

  if (templateKey) {
    query += ' WHERE template_key = ?';
    params.push(templateKey);
  }

  query += ' ORDER BY template_key ASC, version DESC';
  const { rows } = await executeQuery(query, params);
  return rows;
};

const getActiveTemplate = async (templateKey) => {
  const { rows } = await executeQuery(
    'SELECT * FROM document_templates WHERE template_key = ? AND is_active = TRUE ORDER BY version DESC LIMIT 1',
    [templateKey]
  );
  return rows[0] || null;
};

const getTemplateById = async (id) => {
  const { rows } = await executeQuery('SELECT * FROM document_templates WHERE id = ?', [id]);
  return rows[0] || null;
};

const createTemplate = async ({
  template_key,
  template_name,
  subject,
  text_body,
  html_body,
  placeholders_json,
  is_active = false,
  created_by
}) => {
  const { rows: versionRows } = await executeQuery(
    'SELECT COALESCE(MAX(version), 0) AS max_version FROM document_templates WHERE template_key = ?',
    [template_key]
  );
  const nextVersion = Number(versionRows[0]?.max_version || 0) + 1;

  const result = await executeQuery(
    `
    INSERT INTO document_templates
    (template_key, template_name, subject, text_body, html_body, placeholders_json, is_active, version, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      template_key,
      template_name,
      subject || null,
      text_body,
      html_body || null,
      placeholders_json ? JSON.stringify(placeholders_json) : null,
      !!is_active,
      nextVersion,
      created_by || null,
      created_by || null
    ]
  );

  if (is_active) {
    await executeQuery(
      'UPDATE document_templates SET is_active = FALSE, updated_at = NOW() WHERE template_key = ? AND id != ?',
      [template_key, result.insertId]
    );
  }

  return await getTemplateById(result.insertId);
};

const updateTemplate = async (id, updateData, updatedBy) => {
  const template = await getTemplateById(id);
  if (!template) return null;

  const allowed = ['template_name', 'subject', 'text_body', 'html_body', 'placeholders_json'];
  const updates = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updateData, key)) {
      updates.push(`${key} = ?`);
      if (key === 'placeholders_json') {
        params.push(updateData[key] ? JSON.stringify(updateData[key]) : null);
      } else {
        params.push(updateData[key] ?? null);
      }
    }
  }

  if (updates.length === 0) return template;

  updates.push('updated_by = ?', 'updated_at = NOW()');
  params.push(updatedBy || null);
  params.push(id);

  await executeQuery(
    `UPDATE document_templates SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return await getTemplateById(id);
};

const activateTemplate = async (id, updatedBy) => {
  const template = await getTemplateById(id);
  if (!template) return null;

  await executeQuery(
    'UPDATE document_templates SET is_active = FALSE, updated_by = ?, updated_at = NOW() WHERE template_key = ?',
    [updatedBy || null, template.template_key]
  );
  await executeQuery(
    'UPDATE document_templates SET is_active = TRUE, updated_by = ?, updated_at = NOW() WHERE id = ?',
    [updatedBy || null, id]
  );
  return await getTemplateById(id);
};

module.exports = {
  listTemplates,
  getActiveTemplate,
  getTemplateById,
  createTemplate,
  updateTemplate,
  activateTemplate
};

