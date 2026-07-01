const cron = require('node-cron');
const dailyBriefing = require('./dailyBriefing');
const reminder = require('./reminder');
const cleanup = require('./cleanup');
const { saveWeatherAlerts } = require('../services/weatherService');
const Farm = require('../models/client/Farm');
const logger = require('../utils/logger');

const initializeScheduler = () => {
  logger.info('[Scheduler] Initializing cron jobs');

  cron.schedule('0 4 * * *', async () => {
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

  cron.schedule('0 4 * * *', async () => {
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
    logger.info('[Scheduler] Checking weather alerts');
    try {
      const farms = await Farm.find({ status: 'active' });
      for (const farm of farms) {
        if (farm.location) {
          await saveWeatherAlerts(farm._id, farm.location);
        }
      }
      logger.info('[Scheduler] Weather alerts checked');
    } catch (error) {
      logger.error('[Scheduler] Weather alert check failed', { error: error.message });
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