const Alert = require('../models/client/Alert');
const Vaccination = require('../models/client/Vaccination');
const Production = require('../models/client/Production');
const weatherService = require('./weatherService');
const logger = require('../utils/logger');

const compileBriefing = async (farm) => {
  try {
    const weather = await weatherService.getForecast(farm.location);

    const criticalAlerts = await Alert.find({
      farmId: farm._id,
      level: { $in: ['critical', 'high'] },
      status: 'active',
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const upcomingAlerts = await Alert.find({
      farmId: farm._id,
      level: 'medium',
      status: 'active',
      dueDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    })
      .sort({ dueDate: 1 })
      .limit(10);

    const upcomingVaccinations = await Vaccination.find({
      farmId: farm._id,
      status: 'pending',
      dueDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    })
      .sort({ dueDate: 1 })
      .limit(10);

    const vaccinationReminders = upcomingVaccinations.map((v) => ({
      _id: v._id,
      type: 'vaccination',
      title: `${v.vaccineName} Due`,
      description: `${v.animalCount} animal(s)`,
      level: 'medium',
      dueDate: v.dueDate,
    }));

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

    return {
      farmId: farm._id,
      farmName: farm.name,
      date: new Date().toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      weather,
      criticalActions: criticalAlerts,
      upcoming: [...upcomingAlerts, ...vaccinationReminders].slice(0, 10),
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
  } catch (error) {
    logger.error('[Briefing Service] Failed to compile', {
      error: error.message,
      farmId: farm._id,
    });
    return null;
  }
};

module.exports = { compileBriefing };