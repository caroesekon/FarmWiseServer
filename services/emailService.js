const axios = require('axios');
const hdmBridge = require('../config/hdmBridge');
const templates = require('./emailTemplates');
const logger = require('../utils/logger');

const send = async ({ to, subject, template, data, htmlBody, textBody }) => {
  try {
    let html = htmlBody;
    let text = textBody;

    if (template) {
      const templateFn = templates[template];
      if (!templateFn) {
        logger.error('[Email] Template not found', { template });
        return { success: false, error: `Template "${template}" not found` };
      }
      const result = templateFn(data);
      subject = subject || result.subject;
      html = result.html;
      text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    if (!html && !text) {
      return { success: false, error: 'No content provided' };
    }

    const response = await axios.post(
      `${hdmBridge.apiUrl}/emails/send`,
      {
        from: hdmBridge.fromEmail,
        fromName: hdmBridge.fromName,
        to,
        subject,
        htmlBody: html,
        textBody: text || html?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${hdmBridge.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    logger.info('[Email] Sent', { to, template: template || 'raw', subject });
    return { success: true, messageId: response.data?.messageId || response.data?.id, to };
  } catch (error) {
    logger.error('[Email] Failed to send', {
      error: error.response?.data || error.message,
      to,
      template: template || 'raw',
    });
    return { success: false, error: error.response?.data || error.message };
  }
};

const sendBulk = async ({ recipients, template, data, subject, htmlBody, textBody }) => {
  try {
    const results = [];
    for (const recipient of recipients) {
      const result = await send({
        to: recipient.email,
        subject,
        template,
        data: { ...data, ...recipient.customData },
        htmlBody,
        textBody,
      });
      results.push({ email: recipient.email, ...result });
    }
    logger.info('[Email] Bulk sent', {
      total: recipients.length,
      successful: results.filter((r) => r.success).length,
      template: template || 'raw',
    });
    return { success: true, results };
  } catch (error) {
    logger.error('[Email] Bulk send failed', { error: error.message });
    return { success: false, error: error.message };
  }
};

module.exports = { send, sendBulk };