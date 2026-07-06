const Alert = require('../models/client/Alert');
const User = require('../models/client/User');
const Farm = require('../models/client/Farm');
const emailService = require('./emailService');
const logger = require('../utils/logger');

const createAlert = async ({
  farmId,
  type,
  title,
  description,
  level,
  dueDate,
  animalIds = [],
  referenceId,
}) => {
  try {
    const alert = await Alert.create({
      farmId,
      type,
      title,
      description,
      level,
      dueDate: dueDate || new Date(),
      animalIds,
      referenceId,
      status: 'active',
    });

    logger.info('[Alert Engine] Created alert', {
      alertId: alert._id,
      farmId,
      type,
      level,
    });

    if (level === 'critical' || level === 'high') {
      const farmAdmin = await User.findOne({ farmId, role: 'farmAdmin', status: 'active' });
      const farm = await Farm.findById(farmId).select('name');

      if (farmAdmin?.email) {
        const template =
          type === 'health' ? 'animalHealthEmergency' :
          type === 'production_drop' ? 'productionDrop' :
          type === 'inventory' ? 'stockCritical' :
          type === 'weather' ? 'weatherExtreme' : null;

        if (template) {
          let emailData = { farmName: farm?.name || 'Your Farm' };

          if (type === 'production_drop') {
            const Animal = require('../models/client/Animal');
            const animal = animalIds[0] ? await Animal.findById(animalIds[0]).select('tag') : null;
            const match = description.match(/(.+) dropped by (\d+)% \((.+) vs avg (.+)\)/);
            emailData = {
              ...emailData,
              animalTag: animal?.tag || 'Unknown',
              dropPercentage: match ? `${match[2]}%` : description,
              currentProduction: match ? match[3] : '',
              averageProduction: match ? match[4] : '',
            };
          } else if (type === 'health') {
            emailData = {
              ...emailData,
              animalTag: animalIds[0] || 'Unknown',
              diagnosis: description,
              severity: level,
              recommendedAction: 'Immediate veterinary attention recommended.',
            };
          } else if (type === 'inventory') {
            emailData = {
              ...emailData,
              itemName: title,
              description,
              currentStock: '',
              unit: '',
              reorderAt: '',
            };
          } else if (type === 'weather') {
            emailData = {
              ...emailData,
              weatherType: title,
              message: description,
              precautions: [],
            };
          }

          await emailService.send({
            to: farmAdmin.email,
            template,
            data: emailData,
          });

          logger.info('[Alert Engine] Email sent', { farmId, type, level });
        }
      }
    }

    return alert;
  } catch (error) {
    logger.error('[Alert Engine] Failed to create alert', {
      error: error.message,
      farmId,
      type,
    });
    return null;
  }
};

const checkProductionAnomaly = async (farmId, animalId, currentProduction, averageProduction) => {
  const threshold = 0.2;
  const drop = (averageProduction - currentProduction) / averageProduction;

  if (drop >= threshold) {
    const Animal = require('../models/client/Animal');
    const animal = await Animal.findById(animalId).select('tag');

    await createAlert({
      farmId,
      type: 'production_drop',
      title: 'Production Drop Detected',
      description: `${animal?.tag || 'Unknown'} dropped by ${(drop * 100).toFixed(0)}% (${currentProduction} vs avg ${averageProduction.toFixed(1)})`,
      level: 'high',
      animalIds: [animalId],
    });
  }
};

const resolveAlert = async (alertId) => {
  try {
    await Alert.findByIdAndUpdate(alertId, { status: 'resolved' });
    logger.info('[Alert Engine] Resolved alert', { alertId });
  } catch (error) {
    logger.error('[Alert Engine] Failed to resolve alert', {
      error: error.message,
      alertId,
    });
  }
};

const getActiveAlerts = async (farmId, limit = 20) => {
  try {
    return await Alert.find({ farmId, status: 'active' })
      .sort({ level: -1, createdAt: -1 })
      .limit(limit);
  } catch (error) {
    logger.error('[Alert Engine] Failed to get alerts', {
      error: error.message,
      farmId,
    });
    return [];
  }
};

module.exports = {
  createAlert,
  checkProductionAnomaly,
  resolveAlert,
  getActiveAlerts,
};