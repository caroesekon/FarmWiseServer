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
const Finance = require('../../models/client/Finance');
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
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const farm = await Farm.findById(req.farmId).select('name location size sizeUnit livestock crops productPrices trialStatus trialEndsAt');

    const [
      animals, healthRecords, vaccinations, recentProduction, breedingRecords,
      fields, crops, inventory, equipment, financeRecords, tasks, alerts,
      currentWeather, forecast, seasonal,
    ] = await Promise.all([
      Animal.find({ farmId: req.farmId }).select('tag breed sex category birthDate status pen group weight'),
      HealthRecord.find({ farmId: req.farmId }).sort({ date: -1 }).limit(20).select('animalId type diagnosis symptoms treatment medication severity date outcome'),
      Vaccination.find({ farmId: req.farmId }).select('vaccineName animalIds animalCount dueDate status completedDate vetName'),
      Production.find({ farmId: req.farmId }).sort({ date: -1 }).limit(50).select('animalId type quantity unit value date'),
      Breeding.find({ farmId: req.farmId }).sort({ eventDate: -1 }).limit(20).select('animalId eventType eventDate expectedDate pregnancyStatus status'),
      Field.find({ farmId: req.farmId }).select('name size sizeUnit soilType currentCrop status restEndDate'),
      Crop.find({ farmId: req.farmId }).select('fieldId cropType variety plantingDate expectedHarvestDate actualHarvestDate yield status'),
      Inventory.find({ farmId: req.farmId }).select('name category currentStock unit reorderAt dailyConsumption status expiryDate'),
      Equipment.find({ farmId: req.farmId }).select('name category make model usageHours nextMaintenanceDate status'),
      Finance.find({ farmId: req.farmId }).sort({ date: -1 }).limit(30).select('type category amount date description'),
      Task.find({ farmId: req.farmId, status: { $in: ['pending', 'in_progress'] } }).select('title description category assignedTo dueDate priority status'),
      Alert.find({ farmId: req.farmId, status: 'active' }).select('type title description level dueDate'),
      weatherService.getForecast(farm?.location),
     weatherService.getMultiDayForecast(farm?.location, 14),
      weatherService.getSeasonalAdvisory(farm?.location),
    ]);

    const animalMap = {};
    animals.forEach((a) => { animalMap[a._id.toString()] = a.tag; });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayProduction = recentProduction.filter((p) => new Date(p.date) >= today);
    const todayMilk = todayProduction.filter((p) => p.type === 'milk').reduce((s, p) => s + p.quantity, 0);
    const todayEggs = todayProduction.filter((p) => p.type === 'eggs').reduce((s, p) => s + p.quantity, 0);
    const todayValue = todayProduction.reduce((s, p) => s + (p.value || 0), 0);
    const totalMilk = recentProduction.filter((p) => p.type === 'milk').reduce((s, p) => s + p.quantity, 0);
    const totalEggs = recentProduction.filter((p) => p.type === 'eggs').reduce((s, p) => s + p.quantity, 0);
    const totalValue = recentProduction.reduce((s, p) => s + (p.value || 0), 0);

    const totalIncome = financeRecords.filter((f) => f.type === 'income').reduce((s, f) => s + f.amount, 0);
    const totalExpense = financeRecords.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0);

    const farmContext = {
      farm: {
        name: farm?.name,
        location: farm?.location,
        size: farm?.size ? `${farm.size} ${farm.sizeUnit}` : null,
        livestock: farm?.livestock,
        crops: farm?.crops,
        trialStatus: farm?.trialStatus,
        trialEndsAt: farm?.trialEndsAt,
        productPrices: farm?.productPrices?.map((p) => `${p.name}: KES ${p.price}/${p.unit}`) || [],
      },
      weather: {
        current: currentWeather && currentWeather.summary !== 'Weather data unavailable' ? {
          summary: currentWeather.summary,
          temperature: currentWeather.temp || currentWeather.high ? `${currentWeather.temp || currentWeather.high}°C` : null,
          humidity: currentWeather.humidity ? `${currentWeather.humidity}%` : null,
          wind: currentWeather.windSpeed ? `${currentWeather.windSpeed} m/s` : null,
          rainfall: currentWeather.rainfall ? `${currentWeather.rainfall}mm` : 'none',
        } : null,
        forecast: forecast?.slice(0, 7).map((d) => ({
          date: d.date, high: d.high, low: d.low, rainfall: d.rainfall, summary: d.summary,
        })) || [],
        seasonal: seasonal ? {
          month: seasonal.month, season: seasonal.season,
          advisory: seasonal.advisory,
          weeklyAdvisory: seasonal.weeklyAdvisory,
          weekAhead: seasonal.weekAhead,
        } : null,
      },
      production: {
        today: { milk: `${todayMilk}L`, eggs: todayEggs, value: `KES ${todayValue}`, records: todayProduction.length },
        total: { milk: `${totalMilk}L`, eggs: totalEggs, value: `KES ${totalValue}`, records: recentProduction.length },
      },
      finances: {
        totalIncome: `KES ${totalIncome}`,
        totalExpense: `KES ${totalExpense}`,
        balance: `KES ${totalIncome - totalExpense}`,
        recentTransactions: financeRecords.slice(0, 10).map((f) => ({
          type: f.type, category: f.category, amount: `KES ${f.amount}`, date: f.date, description: f.description,
        })),
      },
      animals: animals.map((a) => ({
        tag: a.tag, breed: a.breed, sex: a.sex, category: a.category,
        age: formatAge(a.birthDate), status: a.status, pen: a.pen, group: a.group,
        weight: a.weight?.current ? `${a.weight.current} kg` : null,
      })),
      health: healthRecords.map((h) => ({
        animal: animalMap[h.animalId?.toString()] || 'unknown',
        type: h.type, diagnosis: h.diagnosis, symptoms: h.symptoms,
        treatment: h.treatment, severity: h.severity, date: h.date, outcome: h.outcome,
      })),
      vaccinations: vaccinations.map((v) => ({
        vaccine: v.vaccineName, animals: v.animalIds?.map((id) => animalMap[id?.toString()] || 'unknown').join(', '),
        count: v.animalCount, dueDate: v.dueDate, status: v.status, completedDate: v.completedDate, vet: v.vetName,
      })),
      breeding: breedingRecords.map((b) => ({
        animal: animalMap[b.animalId?.toString()] || 'unknown',
        event: b.eventType, date: b.eventDate, expectedDate: b.expectedDate,
        pregnancyStatus: b.pregnancyStatus, status: b.status,
      })),
      fields: fields.map((f) => ({
        name: f.name, size: f.size ? `${f.size} ${f.sizeUnit}` : null,
        soilType: f.soilType, currentCrop: f.currentCrop, status: f.status, restEnds: f.restEndDate,
      })),
      crops: crops.map((c) => ({
        crop: c.cropType, variety: c.variety, planted: c.plantingDate,
        expectedHarvest: c.expectedHarvestDate, harvested: c.actualHarvestDate,
        yield: c.yield ? `${c.yield.quantity} ${c.yield.unit}` : null, status: c.status,
      })),
      inventory: inventory.map((i) => ({
        item: i.name, category: i.category, stock: `${i.currentStock} ${i.unit}`,
        reorderAt: i.reorderAt ? `${i.reorderAt} ${i.unit}` : null,
        dailyUse: i.dailyConsumption ? `${i.dailyConsumption} ${i.unit}/day` : null,
        status: i.status, expires: i.expiryDate,
      })),
      equipment: equipment.map((e) => ({
        name: e.name, category: e.category, make: e.make, model: e.model,
        usageHours: e.usageHours, nextMaintenance: e.nextMaintenanceDate, status: e.status,
      })),
      tasks: tasks.map((t) => ({
        title: t.title, description: t.description, category: t.category,
        dueDate: t.dueDate, priority: t.priority, status: t.status,
      })),
      alerts: alerts.map((a) => ({
        type: a.type, title: a.title, description: a.description, level: a.level, dueDate: a.dueDate,
      })),
    };

    const result = await aiService.chat({ message, farmContext, language });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.reply });
    }

    res.status(200).json({
      success: true,
      data: { reply: result.reply, tokensUsed: result.tokensUsed, provider: result.provider },
    });
  } catch (error) {
    logger.error('[Client AI] Chat failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to process AI request.' });
  }
};

module.exports = { chat };