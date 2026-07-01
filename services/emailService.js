const axios = require('axios');
const hdmBridge = require('../config/hdmBridge');
const templates = require('./emailTemplates');
const logger = require('../utils/logger');

const send = async ({ to, subject, template, data }) => {
  try {
    const templateFn = templates[template];

    if (!templateFn) {
      logger.error('[Email] Template not found', { template });
      return { success: false, error: `Template "${template}" not found` };
    }

    const { subject: generatedSubject, html } = templateFn(data);
    const finalSubject = subject || generatedSubject;

    const textBody = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    const response = await axios.post(
      `${hdmBridge.apiUrl}/emails/send`,
      {
        from: hdmBridge.fromEmail,
        fromName: hdmBridge.fromName,
        to,
        subject: finalSubject,
        htmlBody: html,
        textBody,
      },
      {
        headers: {
          Authorization: `Bearer ${hdmBridge.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('[Email] Sent', { to, template, subject: finalSubject });

    return {
      success: true,
      messageId: response.data?.messageId || response.data?.id,
      to,
      template,
    };
  } catch (error) {
    logger.error('[Email] Failed to send', {
      error: error.response?.data || error.message,
      to,
      template,
    });
    return { success: false, error: error.response?.data || error.message };
  }
};

const sendBulk = async ({ recipients, template, data, subject }) => {
  try {
    const results = [];

    for (const recipient of recipients) {
      const result = await send({
        to: recipient.email,
        subject,
        template,
        data: { ...data, ...recipient.customData },
      });
      results.push({ email: recipient.email, ...result });
    }

    logger.info('[Email] Bulk sent', {
      total: recipients.length,
      successful: results.filter((r) => r.success).length,
      template,
    });

    return { success: true, results };
  } catch (error) {
    logger.error('[Email] Bulk send failed', { error: error.message });
    return { success: false, error: error.message };
  }
};

module.exports = { send, sendBulk };