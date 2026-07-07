const User = require('../../models/client/User');
const SystemConfig = require('../../models/admin/SystemConfig');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'farmAdmin', status: 'active' })
      .select('name email phone farmId')
      .sort({ name: 1 });

    const list = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
    }));

    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    logger.error('[Communication] Get users failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

const sendEmail = async (req, res) => {
  try {
    const { sendTo, userId, customEmail, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required.' });
    }

    if (!['all', 'single', 'custom'].includes(sendTo)) {
      return res.status(400).json({ success: false, message: 'sendTo must be: all, single, or custom.' });
    }

    const supportConfig = await SystemConfig.findOne({ key: 'supportInfo' });
    const supportPhone = supportConfig?.value?.phone || '';
    const supportEmail = supportConfig?.value?.email || process.env.HDM_FROM_EMAIL || '';

    let recipients = [];

    if (sendTo === 'all') {
      const users = await User.find({ role: 'farmAdmin', status: 'active', email: { $ne: null } }).select('name email');
      recipients = users.filter((u) => u.email);
    } else if (sendTo === 'single') {
      if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required for single send.' });
      }
      const user = await User.findById(userId).select('name email');
      if (user?.email) recipients = [user];
    } else if (sendTo === 'custom') {
      if (!customEmail) {
        return res.status(400).json({ success: false, message: 'customEmail is required for custom send.' });
      }
      const emails = customEmail.split(',').map((e) => e.trim()).filter((e) => e);
      recipients = emails.map((e) => ({ name: e.split('@')[0], email: e }));
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid recipients found.' });
    }

    const messageHtml = message.replace(/\n/g, '<br/>');

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const htmlBody = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="background-color: #1b5e20; padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">🌾 FarmWise</h1>
              <p style="color: #a5d6a7; margin: 6px 0 0; font-size: 14px;">Farm Smarter, Grow Further</p>
            </div>
            <div style="padding: 32px 24px;">
              <p style="color: #444444; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hello ${recipient.name || 'there'},</p>
              <div style="color: #444444; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                ${messageHtml}
              </div>
              ${(supportPhone || supportEmail) ? `
              <div style="background-color: #f9faf9; border-left: 4px solid #1b5e20; padding: 16px; border-radius: 4px; margin-top: 20px;">
                <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #333;">Need Help?</p>
                ${supportPhone ? `<p style="margin: 4px 0; font-size: 14px; color: #555;">📞 <a href="tel:${supportPhone}" style="color: #1b5e20; text-decoration: none;">${supportPhone}</a></p>` : ''}
                ${supportEmail ? `<p style="margin: 4px 0; font-size: 14px; color: #555;">📧 <a href="mailto:${supportEmail}" style="color: #1b5e20; text-decoration: none;">${supportEmail}</a></p>` : ''}
              </div>
              ` : ''}
            </div>
            <div style="background-color: #f5f7f5; padding: 20px 24px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 12px; color: #999; line-height: 1.5;">FarmWise — Your Farm, Guided</p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #bbb;">This message was sent by the FarmWise administrator.</p>
            </div>
          </div>
        `;

        const textBody = `Hello ${recipient.name || 'there'},\n\n${message}\n\n${supportPhone ? `Need help? Call ${supportPhone}` : ''}\n${supportEmail ? `Email: ${supportEmail}` : ''}\n\n— FarmWise`;

        await emailService.send({
          to: recipient.email,
          subject,
          htmlBody,
          textBody,
        });
        sent++;
      } catch {
        failed++;
      }
    }

    logger.info('[Communication] Email sent', { sendTo, sent, failed });

    res.status(200).json({
      success: true,
      message: `Email sent to ${sent} recipient(s)${failed > 0 ? `. ${failed} failed.` : ''}`,
      data: { sent, failed, total: recipients.length },
    });
  } catch (error) {
    logger.error('[Communication] Send email failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
};

module.exports = { getUsers, sendEmail };