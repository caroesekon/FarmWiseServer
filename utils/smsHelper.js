const logger = require('./logger');

/**
 * SMS helper — placeholder for future provider integration
 * Will be connected when SMS provider is configured in admin settings
 */

const sendSMS = async ({ phone, message }) => {
  const provider = process.env.SMS_PROVIDER;

  if (!provider || provider === 'none') {
    logger.info('[SMS] No provider configured — message not sent', { phone });
    return { success: false, reason: 'No SMS provider configured' };
  }

  // Future: Africa's Talking, Twilio, etc.
  logger.info('[SMS] Sending message', { provider, phone, messageLength: message.length });

  // Placeholder — implement when provider is chosen
  return { success: false, reason: 'SMS provider not yet implemented' };
};

const sendBulkSMS = async ({ recipients, message }) => {
  const results = [];
  for (const recipient of recipients) {
    const result = await sendSMS({ phone: recipient.phone, message });
    results.push({ phone: recipient.phone, ...result });
  }
  return results;
};

module.exports = {
  sendSMS,
  sendBulkSMS,
};