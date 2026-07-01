const mongoose = require('mongoose');
const HealthRecord = require('../../models/client/HealthRecord');
const Animal = require('../../models/client/Animal');
const { createAlert } = require('../../services/alertEngine');
const logger = require('../../utils/logger');

// @desc    Get health records
// @route   GET /api/health?animalId=xxx or ?batchId=xxx
// @access  Private (all client roles)
const getHealthRecords = async (req, res) => {
  try {
    const { animalId, batchId, page = 1, limit = 20 } = req.query;

    const query = { farmId: req.farmId };

    if (batchId) {
      const animals = await Animal.find({ farmId: req.farmId, batchId, status: 'active' }).select('_id');
      query.animalId = { $in: animals.map((a) => a._id) };
    } else if (animalId) {
      query.animalId = animalId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const records = await HealthRecord.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await HealthRecord.countDocuments(query);

    const batchSummary = await HealthRecord.aggregate([
      { $match: { farmId: new mongoose.Types.ObjectId(req.farmId), notes: { $regex: /^Batch:/ } } },
      {
        $group: {
          _id: '$notes',
          type: { $first: '$type' },
          diagnosis: { $first: '$diagnosis' },
          severity: { $first: '$severity' },
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
        type: b.type,
        diagnosis: b.diagnosis,
        severity: b.severity,
        count: b.count,
        date: b.lastDate,
      })),
      data: records,
    });
  } catch (error) {
    logger.error('[Client Health] Get records failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health records.',
    });
  }
};

// @desc    Add health record (single or batch)
// @route   POST /api/health
// @access  Private (farmAdmin, manager, vet)
const addHealthRecord = async (req, res) => {
  try {
    const {
      animalId,
      batchId,
      type,
      diagnosis,
      symptoms,
      treatment,
      medication,
      vetName,
      vetContact,
      cost,
      date,
      severity,
      notes,
    } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Record type is required.',
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

      const records = await HealthRecord.insertMany(
        animals.map((a) => ({
          farmId: req.farmId,
          animalId: a._id,
          type,
          diagnosis,
          symptoms,
          treatment,
          medication,
          vetName,
          vetContact,
          cost: cost ? cost / animals.length : undefined,
          date: date || new Date(),
          severity: severity || 'moderate',
          recordedBy: req.user.id,
          notes: notes || `Batch: ${batchId}`,
        }))
      );

      if (severity === 'critical' || severity === 'severe') {
        await createAlert({
          farmId: req.farmId,
          type: 'health',
          title: `${severity === 'critical' ? 'Critical' : 'Severe'} Health Event — Batch`,
          description: `Batch ${batchId}: ${diagnosis || type}. ${animals.length} animals affected. Immediate attention required.`,
          level: severity === 'critical' ? 'critical' : 'high',
          animalIds: animals.map((a) => a._id),
          referenceId: records[0]._id,
        });
      }

      logger.info('[Client Health] Batch records added', {
        farmId: req.farmId,
        batchId,
        count: records.length,
      });

      return res.status(201).json({
        success: true,
        message: `Health record added for ${records.length} animals.`,
        data: { count: records.length, batchId },
      });
    }

    if (!animalId) {
      return res.status(400).json({
        success: false,
        message: 'Animal ID or Batch ID is required.',
      });
    }

    const record = await HealthRecord.create({
      farmId: req.farmId,
      animalId,
      type,
      diagnosis,
      symptoms,
      treatment,
      medication,
      vetName,
      vetContact,
      cost,
      date: date || new Date(),
      severity: severity || 'moderate',
      recordedBy: req.user.id,
      notes,
    });

    if (severity === 'critical' || severity === 'severe') {
      await createAlert({
        farmId: req.farmId,
        type: 'health',
        title: `${severity === 'critical' ? 'Critical' : 'Severe'} Health Event`,
        description: `Animal #${animalId}: ${diagnosis || type}. Immediate attention required.`,
        level: severity === 'critical' ? 'critical' : 'high',
        animalIds: [animalId],
        referenceId: record._id,
      });
    }

    logger.info('[Client Health] Record added', {
      recordId: record._id,
      farmId: req.farmId,
      animalId,
    });

    res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error) {
    logger.error('[Client Health] Add record failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to add health record.',
    });
  }
};

module.exports = {
  getHealthRecords,
  addHealthRecord,
};