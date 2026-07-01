const mongoose = require('mongoose');
const Production = require('../../models/client/Production');
const Animal = require('../../models/client/Animal');
const { checkProductionAnomaly } = require('../../services/alertEngine');
const logger = require('../../utils/logger');

// @desc    Record production (single or batch)
// @route   POST /api/production
// @access  Private (farmAdmin, manager, worker)
const recordProduction = async (req, res) => {
  try {
    const { animalId, batchId, type, quantity, unit, date, session, notes } = req.body;

    if (!type || quantity === undefined || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Type, quantity, and unit are required.',
      });
    }

    if (batchId) {
      const animals = await Animal.find({ farmId: req.farmId, batchId, status: 'active' });

      if (animals.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active animals found in this batch.',
        });
      }

      const perAnimal = quantity / animals.length;

      const records = await Production.insertMany(
        animals.map((a) => ({
          farmId: req.farmId,
          animalId: a._id,
          type,
          quantity: perAnimal,
          unit,
          date: date || new Date(),
          session: session || 'single',
          recordedBy: req.user.id,
          notes: notes || `Batch: ${batchId}`,
        }))
      );

      logger.info('[Client Production] Batch recorded', {
        farmId: req.farmId,
        batchId,
        count: records.length,
        total: quantity,
      });

      return res.status(201).json({
        success: true,
        message: `Production recorded for ${records.length} animals (${quantity} ${unit} total).`,
        data: { count: records.length, batchId, totalQuantity: quantity, unit },
      });
    }

    if (!animalId) {
      return res.status(400).json({
        success: false,
        message: 'Animal ID or Batch ID is required.',
      });
    }

    const record = await Production.create({
      farmId: req.farmId,
      animalId,
      type,
      quantity,
      unit,
      date: date || new Date(),
      session: session || 'single',
      recordedBy: req.user.id,
      notes,
    });

    const recentRecords = await Production.find({
      farmId: req.farmId,
      animalId,
      type,
    })
      .sort({ date: -1 })
      .limit(10);

    if (recentRecords.length >= 5) {
      const average = recentRecords.reduce((sum, r) => sum + r.quantity, 0) / recentRecords.length;
      await checkProductionAnomaly(req.farmId, animalId, quantity, average);
    }

    logger.info('[Client Production] Recorded', { recordId: record._id, farmId: req.farmId });

    res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error) {
    logger.error('[Client Production] Record failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to record production.',
    });
  }
};

// @desc    Get production history
// @route   GET /api/production
// @access  Private (all client roles)
const getProduction = async (req, res) => {
  try {
    const { animalId, type, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = { farmId: req.farmId };

    if (animalId) query.animalId = animalId;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const records = await Production.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('animalId', 'tag breed');

    const total = await Production.countDocuments(query);

    const batchSummary = await Production.aggregate([
      { $match: { farmId: new mongoose.Types.ObjectId(req.farmId), notes: { $regex: /^Batch:/ } } },
      {
        $group: {
          _id: '$notes',
          totalQuantity: { $sum: '$quantity' },
          count: { $sum: 1 },
          lastDate: { $max: '$date' },
        },
      },
      { $sort: { lastDate: -1 } },
    ]);

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      batchSummary: batchSummary.map((b) => ({
        batchId: b._id.replace('Batch: ', ''),
        totalQuantity: Math.round(b.totalQuantity * 100) / 100,
        count: b.count,
        date: b.lastDate,
      })),
      data: records,
    });
  } catch (error) {
    logger.error('[Client Production] Get failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch production records.',
    });
  }
};

module.exports = {
  recordProduction,
  getProduction,
};