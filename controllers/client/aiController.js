const aiService = require('../../services/aiService');
const Farm = require('../../models/client/Farm');
const Animal = require('../../models/client/Animal');
const HealthRecord = require('../../models/client/HealthRecord');
const Vaccination = require('../../models/client/Vaccination');
const Production = require('../../models/client/Production');
const Breeding = require('../../models/client/Breeding');
const Field = require('../../models/client/Field');
const Crop = require('../../models/client/Crop');
const Inventory = require('../../models/client/Inventory');
const Equipment = require('../../models/client/Equipment');
const Task = require('../../models/client/Task');
const Alert = require('../../models/client/Alert');
const weatherService = require('../../services/weatherService');
const logger = require('../../utils/logger');

function formatAge(birthDate) {
  if (!birthDate) return 'unknown';
  const ageInDays = Math.floor((Date.now() - new Date(birthDate)) / (1000 * 60 * 60 * 24));
  if (ageInDays < 0) return 'not yet born';
  if (ageInDays < 30) return `${ageInDays} day${ageInDays > 1 ? 's' : ''}`;
  if (ageInDays < 365) {
    const months = Math.floor(ageInDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  const years = Math.floor(ageInDays / 365);
  const remainingMonths = Math.floor((ageInDays % 365) / 30);
  let display = `${years} year${years > 1 ? 's' : ''}`;
  if (remainingMonths > 0) display += ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  return display;
}

// @desc    Chat with FarmWise AI
// @route   POST /api/ai/chat
// @access  Private (all client roles)
const chat = async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required.',
      });
    }

    const farm = await Farm.findById(req.farmId).select('name location size sizeUnit livestock crops');

    const [
      animals,
      healthRecords,
      vaccinations,
      recentProduction,
      breedingRecords,
      fields,
      crops,
      inventory,
      equipment,
      tasks,
      alerts,
      weather,
    ] = await Promise.all([
      Animal.find({ farmId: req.farmId }).select('tag breed sex category birthDate status pen group weight'),
      HealthRecord.find({ farmId: req.farmId }).sort({ date: -1 }).limit(20).select('animalId type diagnosis symptoms treatment medication severity date outcome'),
      Vaccination.find({ farmId: req.farmId }).select('vaccineName animalIds animalCount dueDate status completedDate'),
      Production.find({ farmId: req.farmId }).sort({ date: -1 }).limit(50).select('animalId type quantity unit date'),
      Breeding.find({ farmId: req.farmId }).sort({ eventDate: -1 }).limit(20).select('animalId eventType eventDate expectedDate pregnancyStatus status'),
      Field.find({ farmId: req.farmId }).select('name size sizeUnit soilType currentCrop status restEndDate'),
      Crop.find({ farmId: req.farmId }).select('fieldId cropType variety plantingDate expectedHarvestDate status'),
      Inventory.find({ farmId: req.farmId }).select('name category currentStock unit reorderAt dailyConsumption status expiryDate'),
      Equipment.find({ farmId: req.farmId }).select('name category make model usageHours nextMaintenanceDate status'),
      Task.find({ farmId: req.farmId, status: { $in: ['pending', 'in_progress'] } }).select('title description category assignedTo dueDate priority status'),
      Alert.find({ farmId: req.farmId, status: 'active' }).select('type title description level dueDate'),
      weatherService.getForecast(farm?.location),
    ]);

    const animalMap = {};
    animals.forEach((a) => {
      animalMap[a._id.toString()] = a.tag;
    });

    const farmContext = {
      farm: {
        name: farm?.name,
        location: farm?.location,
        size: farm?.size ? `${farm.size} ${farm.sizeUnit}` : null,
        livestock: farm?.livestock,
        crops: farm?.crops,
      },
      weather: weather && weather.summary !== 'Weather data unavailable' ? {
        summary: weather.summary,
        temperature: weather.high ? `${weather.low || '?'}°C - ${weather.high}°C` : null,
        humidity: weather.humidity ? `${weather.humidity}%` : null,
        wind: weather.windSpeed ? `${weather.windSpeed} m/s` : null,
        rainfall: weather.rainfall ? `${weather.rainfall}mm` : 'none',
      } : null,
      animals: animals.map((a) => ({
        tag: a.tag,
        breed: a.breed,
        sex: a.sex,
        category: a.category,
        age: formatAge(a.birthDate),
        status: a.status,
        pen: a.pen,
        group: a.group,
        weight: a.weight?.current ? `${a.weight.current} kg` : null,
      })),
      health: healthRecords.map((h) => ({
        animal: animalMap[h.animalId?.toString()] || 'unknown',
        type: h.type,
        diagnosis: h.diagnosis,
        symptoms: h.symptoms,
        treatment: h.treatment,
        severity: h.severity,
        date: h.date,
        outcome: h.outcome,
      })),
      vaccinations: vaccinations.map((v) => ({
        vaccine: v.vaccineName,
        animals: v.animalIds?.map((id) => animalMap[id?.toString()] || 'unknown').join(', '),
        count: v.animalCount,
        dueDate: v.dueDate,
        status: v.status,
        completedDate: v.completedDate,
      })),
      production: {
        summary: (() => {
          const milk = recentProduction.filter((p) => p.type === 'milk').reduce((s, p) => s + p.quantity, 0);
          const eggs = recentProduction.filter((p) => p.type === 'eggs').reduce((s, p) => s + p.quantity, 0);
          return { totalMilk: `${milk} L`, totalEggs: eggs };
        })(),
        recent: recentProduction.slice(0, 10).map((p) => ({
          animal: animalMap[p.animalId?.toString()] || 'unknown',
          type: p.type,
          quantity: `${p.quantity} ${p.unit}`,
          date: p.date,
        })),
      },
      breeding: breedingRecords.map((b) => ({
        animal: animalMap[b.animalId?.toString()] || 'unknown',
        event: b.eventType,
        date: b.eventDate,
        expectedDate: b.expectedDate,
        pregnancyStatus: b.pregnancyStatus,
        status: b.status,
      })),
      fields: fields.map((f) => ({
        name: f.name,
        size: f.size ? `${f.size} ${f.sizeUnit}` : null,
        soilType: f.soilType,
        currentCrop: f.currentCrop,
        status: f.status,
        restEnds: f.restEndDate,
      })),
      crops: crops.map((c) => ({
        crop: c.cropType,
        variety: c.variety,
        planted: c.plantingDate,
        expectedHarvest: c.expectedHarvestDate,
        status: c.status,
      })),
      inventory: inventory.map((i) => ({
        item: i.name,
        category: i.category,
        stock: `${i.currentStock} ${i.unit}`,
        reorderAt: i.reorderAt ? `${i.reorderAt} ${i.unit}` : null,
        dailyUse: i.dailyConsumption ? `${i.dailyConsumption} ${i.unit}/day` : null,
        status: i.status,
        expires: i.expiryDate,
      })),
      equipment: equipment.map((e) => ({
        name: e.name,
        category: e.category,
        make: e.make,
        model: e.model,
        usageHours: e.usageHours,
        nextMaintenance: e.nextMaintenanceDate,
        status: e.status,
      })),
      tasks: tasks.map((t) => ({
        title: t.title,
        description: t.description,
        category: t.category,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
      })),
      alerts: alerts.map((a) => ({
        type: a.type,
        title: a.title,
        description: a.description,
        level: a.level,
        dueDate: a.dueDate,
      })),
    };

    const result = await aiService.chat({
      message,
      farmContext,
      language,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.reply,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        reply: result.reply,
        tokensUsed: result.tokensUsed,
        provider: result.provider,
      },
    });
  } catch (error) {
    logger.error('[Client AI] Chat failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to process AI request.',
    });
  }
};

module.exports = {
  chat,
};