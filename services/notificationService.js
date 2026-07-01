const emailService = require('./emailService');
const { sendSMS } = require('../utils/smsHelper');
const logger = require('../utils/logger');

const notify = async ({ user, template, data, channels = ['email'] }) => {
  const results = [];

  if (channels.includes('email') && user.email) {
    const emailResult = await emailService.send({
      to: user.email,
      template,
      data,
    });
    results.push({ channel: 'email', ...emailResult });
  }

  if (channels.includes('sms') && user.phone) {
    const message = compileSMSMessage(template, data);
    const smsResult = await sendSMS({ phone: user.phone, message });
    results.push({ channel: 'sms', ...smsResult });
  }

  logger.info('[Notification] Sent', {
    userId: user._id,
    template,
    channels,
  });

  return results;
};

const compileSMSMessage = (template, data) => {
  const messages = {
    dailyBriefing: `FarmWise: ${data.weather?.summary || 'Weather unavailable'}. ${data.criticalActions?.length || 0} actions need attention.`,
    reminderUpcoming: `FarmWise: ${data.count} reminder(s) coming up in 3 days. Check your email for details.`,
    reminderFinal: `FarmWise: ${data.count} action(s) due TODAY. Check your email for details.`,
    weatherExtreme: `FarmWise ALERT: ${data.message}. Take action now.`,
    animalHealthEmergency: `FarmWise HEALTH ALERT: ${data.diagnosis}. Check immediately.`,
    stockCritical: `FarmWise: Stock low — ${data.itemName}. Reorder now.`,
  };

  return messages[template] || `FarmWise: You have a new notification. Check your email.`;
};

module.exports = { notify };