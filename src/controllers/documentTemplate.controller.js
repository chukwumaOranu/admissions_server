const {
  listTemplates,
  getActiveTemplate,
  getTemplateById,
  createTemplate,
  updateTemplate,
  activateTemplate
} = require('../models/documentTemplate.model');

const renderWithVariables = (template, variables) => {
  let output = template || '';
  for (const [key, value] of Object.entries(variables || {})) {
    output = output.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value ?? ''));
  }
  return output;
};

const listDocumentTemplatesController = async (req, res) => {
  try {
    const { template_key } = req.query;
    const templates = await listTemplates(template_key);
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getActiveDocumentTemplateController = async (req, res) => {
  try {
    const { templateKey } = req.params;
    const template = await getActiveTemplate(templateKey);
    if (!template) {
      return res.status(404).json({ success: false, message: 'No active template found' });
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDocumentTemplateController = async (req, res) => {
  try {
    const {
      template_key,
      template_name,
      subject,
      text_body,
      html_body,
      placeholders_json,
      is_active
    } = req.body;

    if (!template_key || !template_name || !text_body) {
      return res.status(400).json({
        success: false,
        message: 'template_key, template_name and text_body are required'
      });
    }

    const template = await createTemplate({
      template_key,
      template_name,
      subject,
      text_body,
      html_body,
      placeholders_json,
      is_active: !!is_active,
      created_by: req.user?.id || null
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDocumentTemplateController = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await updateTemplate(id, req.body, req.user?.id || null);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const activateDocumentTemplateController = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await activateTemplate(id, req.user?.id || null);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const previewDocumentTemplateController = async (req, res) => {
  try {
    const { id } = req.params;
    const { variables = {} } = req.body || {};
    const template = await getTemplateById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const text = renderWithVariables(template.text_body, variables);
    const html = renderWithVariables(template.html_body || '', variables);
    res.status(200).json({
      success: true,
      data: {
        rendered_text: text,
        rendered_html: html
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listDocumentTemplatesController,
  getActiveDocumentTemplateController,
  createDocumentTemplateController,
  updateDocumentTemplateController,
  activateDocumentTemplateController,
  previewDocumentTemplateController
};

