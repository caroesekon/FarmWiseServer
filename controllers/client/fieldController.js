const Field = require('../../models/client/Field');
const logger = require('../../utils/logger');

// @desc    Get fields
// @route   GET /api/client/fields
// @access  Private (all client roles)
const getFields = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { farmId: req.farmId };

    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const fields = await Field.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Field.countDocuments(query);

    res.status(200).json({
      success: true,
      count: fields.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: fields,
    });
  } catch (error) {
    logger.error('[Client Field] Get failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fields.',
    });
  }
};

// @desc    Add field
// @route   POST /api/client/fields
// @access  Private (farmAdmin, manager)
const addField = async (req, res) => {
  try {
    const { name, size, sizeUnit, soilType, currentCrop, notes } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Field name is required.',
      });
    }

    const field = await Field.create({
      farmId: req.farmId,
      name,
      size,
      sizeUnit,
      soilType,
      currentCrop,
      notes,
    });

    logger.info('[Client Field] Added', { fieldId: field._id, farmId: req.farmId });

    res.status(201).json({
      success: true,
      data: field,
    });
  } catch (error) {
    logger.error('[Client Field] Add failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to add field.',
    });
  }
};

// @desc    Update field
// @route   PUT /api/client/fields/:id
// @access  Private (farmAdmin, manager)
const updateField = async (req, res) => {
  try {
    const field = await Field.findOne({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found.',
      });
    }

    const { name, size, sizeUnit, soilType, currentCrop, status, restStartDate, restEndDate, notes } = req.body;

    if (name) field.name = name;
    if (size) field.size = size;
    if (sizeUnit) field.sizeUnit = sizeUnit;
    if (soilType) field.soilType = soilType;
    if (currentCrop) field.currentCrop = currentCrop;
    if (status) field.status = status;
    if (restStartDate) field.restStartDate = restStartDate;
    if (restEndDate) field.restEndDate = restEndDate;
    if (notes !== undefined) field.notes = notes;
    field.updatedAt = new Date();

    await field.save();

    res.status(200).json({
      success: true,
      data: field,
    });
  } catch (error) {
    logger.error('[Client Field] Update failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update field.',
    });
  }
};

module.exports = {
  getFields,
  addField,
  updateField,
};