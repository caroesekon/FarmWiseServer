const Crop = require('../../models/client/Crop');
const logger = require('../../utils/logger');

// @desc    Get crops
// @route   GET /api/client/crops
// @access  Private (all client roles)
const getCrops = async (req, res) => {
  try {
    const { fieldId, status, page = 1, limit = 20 } = req.query;

    const query = { farmId: req.farmId };

    if (fieldId) query.fieldId = fieldId;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const crops = await Crop.find(query)
      .sort({ plantingDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Crop.countDocuments(query);

    res.status(200).json({
      success: true,
      count: crops.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: crops,
    });
  } catch (error) {
    logger.error('[Client Crop] Get failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch crops.',
    });
  }
};

// @desc    Add crop
// @route   POST /api/client/crops
// @access  Private (farmAdmin, manager)
const addCrop = async (req, res) => {
  try {
    const { fieldId, cropType, variety, plantingDate, expectedHarvestDate, notes } = req.body;

    if (!fieldId || !cropType || !plantingDate) {
      return res.status(400).json({
        success: false,
        message: 'Field, crop type, and planting date are required.',
      });
    }

    const crop = await Crop.create({
      farmId: req.farmId,
      fieldId,
      cropType,
      variety,
      plantingDate,
      expectedHarvestDate,
      recordedBy: req.user.id,
      notes,
    });

    logger.info('[Client Crop] Added', { cropId: crop._id, farmId: req.farmId });

    res.status(201).json({
      success: true,
      data: crop,
    });
  } catch (error) {
    logger.error('[Client Crop] Add failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to add crop.',
    });
  }
};

// @desc    Harvest crop
// @route   PUT /api/client/crops/:id/harvest
// @access  Private (farmAdmin, manager, worker)
const harvestCrop = async (req, res) => {
  try {
    const { yieldQuantity, yieldUnit, actualHarvestDate, notes } = req.body;

    const crop = await Crop.findOne({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop not found.',
      });
    }

    crop.status = 'harvested';
    crop.actualHarvestDate = actualHarvestDate || new Date();
    crop.yield = {
      quantity: yieldQuantity,
      unit: yieldUnit,
    };
    crop.notes = notes || crop.notes;
    crop.updatedAt = new Date();

    await crop.save();

    logger.info('[Client Crop] Harvested', { cropId: crop._id });

    res.status(200).json({
      success: true,
      data: crop,
    });
  } catch (error) {
    logger.error('[Client Crop] Harvest failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to record harvest.',
    });
  }
};

module.exports = {
  getCrops,
  addCrop,
  harvestCrop,
};