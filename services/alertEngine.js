const Alert = require('../models/client/Alert');
const User = require('../models/client/User');
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
      if (farmAdmin?.email) {
        const template = type === 'health' ? 'animalHealthEmergency' :
                         type === 'production_drop' ? 'productionDrop' :
                         type === 'inventory' ? 'stockCritical' :
                         type === 'weather' ? 'weatherExtreme' : null;

        if (template) {
          await emailService.send({
            to: farmAdmin.email,
            template,
            data: {
              farmName: farmAdmin.farmId,
              animalTag: animalIds?.[0] || 'N/A',
              diagnosis: description,
              severity: level,
              dropPercentage: description,
              currentProduction: '',
              averageProduction: '',
              itemName: title,
              currentStock: '',
              unit: '',
              reorderAt: '',
              weatherType: title,
              message: description,
              precautions: [],
            },
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
    return await Alert.find({
      farmId,
      status: 'active',
    })
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