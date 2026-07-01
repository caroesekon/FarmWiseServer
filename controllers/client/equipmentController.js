const Equipment = require('../../models/client/Equipment');
const logger = require('../../utils/logger');

// @desc    Get equipment
// @route   GET /api/client/equipment
// @access  Private (all client roles)
const getEquipment = async (req, res) => {
  try {
    const { category, status, page = 1, limit = 20 } = req.query;

    const query = { farmId: req.farmId };

    if (category) query.category = category;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const equipment = await Equipment.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Equipment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: equipment.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: equipment,
    });
  } catch (error) {
    logger.error('[Client Equipment] Get failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch equipment.',
    });
  }
};

// @desc    Add equipment
// @route   POST /api/client/equipment
// @access  Private (farmAdmin, manager)
const addEquipment = async (req, res) => {
  try {
    const {
      name,
      category,
      make,
      model,
      year,
      serialNumber,
      purchaseDate,
      purchaseCost,
      serviceIntervalHours,
      notes,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name and category are required.',
      });
    }

    const equipment = await Equipment.create({
      farmId: req.farmId,
      name,
      category,
      make,
      model,
      year,
      serialNumber,
      purchaseDate,
      purchaseCost,
      serviceIntervalHours,
      notes,
    });

    logger.info('[Client Equipment] Added', { equipmentId: equipment._id, farmId: req.farmId });

    res.status(201).json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    logger.error('[Client Equipment] Add failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to add equipment.',
    });
  }
};

// @desc    Log maintenance
// @route   POST /api/client/equipment/:id/maintenance
// @access  Private (farmAdmin, manager)
const logMaintenance = async (req, res) => {
  try {
    const { hours, date, notes, nextMaintenanceDate } = req.body;

    const equipment = await Equipment.findOne({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found.',
      });
    }

    equipment.lastMaintenanceDate = date || new Date();
    equipment.lastMaintenanceHours = hours || equipment.usageHours;
    equipment.nextMaintenanceDate = nextMaintenanceDate || null;
    equipment.notes = notes || equipment.notes;
    equipment.updatedAt = new Date();

    await equipment.save();

    logger.info('[Client Equipment] Maintenance logged', { equipmentId: equipment._id });

    res.status(200).json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    logger.error('[Client Equipment] Maintenance log failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to log maintenance.',
    });
  }
};

module.exports = {
  getEquipment,
  addEquipment,
  logMaintenance,
};