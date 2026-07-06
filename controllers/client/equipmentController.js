const Equipment = require('../../models/client/Equipment');
const logger = require('../../utils/logger');

// @desc    Get equipment
// @route   GET /api/equipment
// @access  Private (all client roles)
const getEquipment = async (req, res) => {
  try {
    const { category, status, page = 1, limit = 20 } = req.query;
    const query = { farmId: req.farmId };
    if (category) query.category = category;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const equipment = await Equipment.find(query).sort({ name: 1 }).skip(skip).limit(parseInt(limit));
    const total = await Equipment.countDocuments(query);

    res.status(200).json({ success: true, count: equipment.length, total, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page), data: equipment });
  } catch (error) {
    logger.error('[Client Equipment] Get failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch equipment.' });
  }
};

// @desc    Add equipment
// @route   POST /api/equipment
// @access  Private (farmAdmin, manager)
const addEquipment = async (req, res) => {
  try {
    const { name, category, make, model, year, serialNumber, purchaseDate, purchaseCost, serviceIntervalHours, notes } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Name and category are required.' });
    }

    const equipment = await Equipment.create({
      farmId: req.farmId, name, category, make, model, year, serialNumber,
      purchaseDate, purchaseCost, serviceIntervalHours, notes,
    });

    logger.info('[Client Equipment] Added', { equipmentId: equipment._id, farmId: req.farmId });
    res.status(201).json({ success: true, data: equipment });
  } catch (error) {
    logger.error('[Client Equipment] Add failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to add equipment.' });
  }
};

// @desc    Update equipment
// @route   PUT /api/equipment/:id
// @access  Private (farmAdmin, manager)
const updateEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findOne({ _id: req.params.id, farmId: req.farmId });

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    const { name, category, make, model, year, serialNumber, purchaseDate, purchaseCost, serviceIntervalHours, usageHours, status, notes } = req.body;

    if (name) equipment.name = name;
    if (category) equipment.category = category;
    if (make) equipment.make = make;
    if (model) equipment.model = model;
    if (year) equipment.year = year;
    if (serialNumber) equipment.serialNumber = serialNumber;
    if (purchaseDate) equipment.purchaseDate = purchaseDate;
    if (purchaseCost !== undefined) equipment.purchaseCost = purchaseCost;
    if (serviceIntervalHours !== undefined) equipment.serviceIntervalHours = serviceIntervalHours;
    if (usageHours !== undefined) equipment.usageHours = usageHours;
    if (status) equipment.status = status;
    if (notes !== undefined) equipment.notes = notes;
    equipment.updatedAt = new Date();

    await equipment.save();

    res.status(200).json({ success: true, data: equipment });
  } catch (error) {
    logger.error('[Client Equipment] Update failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update equipment.' });
  }
};

// @desc    Log maintenance
// @route   POST /api/equipment/:id/maintenance
// @access  Private (farmAdmin, manager)
const logMaintenance = async (req, res) => {
  try {
    const { hours, date, notes, nextMaintenanceDate } = req.body;

    const equipment = await Equipment.findOne({ _id: req.params.id, farmId: req.farmId });

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    equipment.lastMaintenanceDate = date || new Date();
    equipment.lastMaintenanceHours = hours || equipment.usageHours;
    equipment.nextMaintenanceDate = nextMaintenanceDate || null;
    equipment.notes = notes || equipment.notes;
    equipment.updatedAt = new Date();

    await equipment.save();

    logger.info('[Client Equipment] Maintenance logged', { equipmentId: equipment._id });
    res.status(200).json({ success: true, data: equipment });
  } catch (error) {
    logger.error('[Client Equipment] Maintenance log failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to log maintenance.' });
  }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private (farmAdmin only)
const deleteEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findOneAndDelete({ _id: req.params.id, farmId: req.farmId });

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    logger.info('[Client Equipment] Deleted', { equipmentId: equipment._id });
    res.status(200).json({ success: true, message: 'Equipment deleted.' });
  } catch (error) {
    logger.error('[Client Equipment] Delete failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to delete equipment.' });
  }
};

module.exports = { getEquipment, addEquipment, updateEquipment, logMaintenance, deleteEquipment };