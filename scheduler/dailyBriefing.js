const Farm = require('../models/client/Farm');
const User = require('../models/client/User');
const Alert = require('../models/client/Alert');
const Production = require('../models/client/Production');
const emailService = require('../services/emailService');
const weatherService = require('../services/weatherService');
const logger = require('../utils/logger');

const run = async () => {
  const farms = await Farm.find({ status: 'active' });

  logger.info(`[Daily Briefing] Processing ${farms.length} farms`);

  for (const farm of farms) {
    try {
      const farmAdmin = await User.findOne({
        farmId: farm._id,
        role: 'farmAdmin',
        status: 'active',
      });

      if (!farmAdmin || !farmAdmin.email) {
        logger.warn(`[Daily Briefing] No farm admin for farm ${farm._id}`);
        continue;
      }

      if (farmAdmin.preferences?.dailyBriefing === false) {
        logger.info(`[Daily Briefing] Skipped — user opted out: ${farmAdmin._id}`);
        continue;
      }

      const weather = await weatherService.getForecast(farm.location);
      const criticalAlerts = await Alert.find({
        farmId: farm._id,
        level: { $in: ['critical', 'high'] },
        status: 'active',
      }).sort({ createdAt: -1 }).limit(10);

      const upcomingAlerts = await Alert.find({
        farmId: farm._id,
        level: 'medium',
        status: 'active',
        dueDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      }).sort({ dueDate: 1 }).limit(10);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      const todayProduction = await Production.find({
        farmId: farm._id,
        date: { $gte: todayStart },
      });

      const yesterdayProduction = await Production.find({
        farmId: farm._id,
        date: { $gte: yesterdayStart, $lt: todayStart },
      });

      const todayMilk = todayProduction
        .filter((p) => p.type === 'milk')
        .reduce((sum, p) => sum + p.quantity, 0);

      const yesterdayMilk = yesterdayProduction
        .filter((p) => p.type === 'milk')
        .reduce((sum, p) => sum + p.quantity, 0);

      const todayEggs = todayProduction
        .filter((p) => p.type === 'eggs')
        .reduce((sum, p) => sum + p.quantity, 0);

      const yesterdayEggs = yesterdayProduction
        .filter((p) => p.type === 'eggs')
        .reduce((sum, p) => sum + p.quantity, 0);

      const briefing = {
        farmName: farm.name,
        date: new Date().toLocaleDateString('en-KE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        weather,
        criticalActions: criticalAlerts.map(formatAlert),
        upcoming: upcomingAlerts.map(formatAlert),
        snapshot: {
          milk: {
            today: todayMilk,
            yesterday: yesterdayMilk,
            change: yesterdayMilk > 0
              ? (((todayMilk - yesterdayMilk) / yesterdayMilk) * 100).toFixed(1)
              : '0',
          },
          eggs: {
            today: todayEggs,
            yesterday: yesterdayEggs,
            change: yesterdayEggs > 0
              ? (((todayEggs - yesterdayEggs) / yesterdayEggs) * 100).toFixed(1)
              : '0',
          },
        },
        healthAlerts: criticalAlerts.filter((a) => a.type === 'health').length,
        weatherAlerts: 0,
      };

      await emailService.send({
        to: farmAdmin.email,
        template: 'dailyBriefing',
        data: briefing,
      });

      logger.info(`[Daily Briefing] Sent to farm ${farm._id}`);
    } catch (error) {
      logger.error(`[Daily Briefing] Failed for farm ${farm._id}`, {
        error: error.message,
      });
    }
  }
};

const formatAlert = (alert) => ({
  type: alert.type,
  title: alert.title,
  description: alert.description,
  level: alert.level,
  dueDate: alert.dueDate,
  animalIds: alert.animalIds,
});

module.exports = { run };