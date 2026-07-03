const cron = require('node-cron');
const dailyBriefing = require('./dailyBriefing');
const reminder = require('./reminder');
const cleanup = require('./cleanup');
const { saveWeatherAlerts } = require('../services/weatherService');
const backupService = require('../services/backupService');
const Farm = require('../models/client/Farm');
const SystemConfig = require('../models/admin/SystemConfig');
const logger = require('../utils/logger');

const initializeScheduler = () => {
  logger.info('[Scheduler] Initializing cron jobs');

  cron.schedule('0 6 * * *', async () => {
    logger.info('[Scheduler] Starting daily briefing');
    try {
      await dailyBriefing.run();
      logger.info('[Scheduler] Daily briefing completed');
    } catch (error) {
      logger.error('[Scheduler] Daily briefing failed', { error: error.message });
    }
  }, {
    timezone: 'Africa/Nairobi',
  });

  cron.schedule('0 6 * * *', async () => {
    logger.info('[Scheduler] Starting reminder check');
    try {
      await reminder.run();
      logger.info('[Scheduler] Reminder check completed');
    } catch (error) {
      logger.error('[Scheduler] Reminder check failed', { error: error.message });
    }
  }, {
    timezone: 'Africa/Nairobi',
  });

  cron.schedule('0 * * * *', async () => {
    try {
      const farms = await Farm.find({ status: 'active' });
      for (const farm of farms) {
        if (farm.location) {
          await saveWeatherAlerts(farm._id, farm.location);
        }
      }
    } catch (error) {
      logger.error('[Scheduler] Weather alert check failed', { error: error.message });
    }
  }, {
    timezone: 'Africa/Nairobi',
  });

  cron.schedule('0 1 * * *', async () => {
    try {
      const result = await Farm.updateMany(
        {
          trialStatus: 'trial',
          trialEndsAt: { $lt: new Date() },
        },
        {
          trialStatus: 'expired',
          updatedAt: new Date(),
        }
      );
      if (result.modifiedCount > 0) {
        logger.info(`[Scheduler] Expired ${result.modifiedCount} trial(s)`);
      }
    } catch (error) {
      logger.error('[Scheduler] Trial expiry check failed', { error: error.message });
    }
  }, {
    timezone: 'Africa/Nairobi',
  });

  cron.schedule('0 2 * * *', async () => {
    logger.info('[Scheduler] Starting auto backup check');
    try {
      const config = await SystemConfig.findOne({ key: 'backupConfig' });
      const frequency = config?.value?.frequency || 'none';
      const today = new Date();
      const dayOfWeek = today.getDay();
      const dayOfMonth = today.getDate();

      let shouldRun = false;
      if (frequency === 'daily') shouldRun = true;
      if (frequency === 'weekly' && dayOfWeek === 0) shouldRun = true;
      if (frequency === 'monthly' && dayOfMonth === 1) shouldRun = true;

      if (shouldRun) {
        const backup = await backupService.createBackup();
        await backupService.cleanupOldBackups(config?.value?.maxFiles || 30);

        if (config?.value?.autoEmail && config?.value?.email) {
          await backupService.sendBackupEmail(backup.filename, config.value.email);
        }

        logger.info('[Scheduler] Auto backup completed', { filename: backup.filename });
      }
    } catch (error) {
      logger.error('[Scheduler] Auto backup failed', { error: error.message });
    }
  }, {
    timezone: 'Africa/Nairobi',
  });

  cron.schedule('0 0 * * 0', async () => {
    logger.info('[Scheduler] Starting weekly cleanup');
    try {
      await cleanup.run();
      logger.info('[Scheduler] Cleanup completed');
    } catch (error) {
      logger.error('[Scheduler] Cleanup failed', { error: error.message });
    }
  }, {
    timezone: 'Africa/Nairobi',
  });

  logger.info('[Scheduler] All cron jobs initialized');
};

module.exports = initializeScheduler;