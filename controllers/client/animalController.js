const Animal = require('../../models/client/Animal');
const HealthRecord = require('../../models/client/HealthRecord');
const Vaccination = require('../../models/client/Vaccination');
const Production = require('../../models/client/Production');
const Breeding = require('../../models/client/Breeding');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// @desc    Get all animals
// @route   GET /api/animals
// @access  Private (all client roles)
const getAnimals = async (req, res) => {
  try {
    const { status, category, batchId, search, page = 1, limit = 50 } = req.query;

    const query = { farmId: req.farmId };

    if (status) query.status = status;
    if (category) query.category = category;
    if (batchId) query.batchId = batchId;
    if (search) {
      query.$or = [
        { tag: { $regex: search, $options: 'i' } },
        { breed: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const animals = await Animal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Animal.countDocuments(query);

    res.status(200).json({
      success: true,
      count: animals.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: animals,
    });
  } catch (error) {
    logger.error('[Client Animal] Get animals failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch animals.',
    });
  }
};

// @desc    Get batches
// @route   GET /api/animals/batches
// @access  Private (all client roles)
const getBatches = async (req, res) => {
  try {
    const batches = await Animal.aggregate([
      { $match: { farmId: new mongoose.Types.ObjectId(req.farmId), batchId: { $ne: null } } },
      {
        $group: {
          _id: '$batchId',
          breed: { $first: '$breed' },
          category: { $first: '$category' },
          sex: { $first: '$sex' },
          pen: { $first: '$pen' },
          birthDate: { $first: '$birthDate' },
          count: { $sum: 1 },
          tags: { $push: '$tag' },
          status: { $first: '$status' },
          createdAt: { $first: '$createdAt' },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: batches,
    });
  } catch (error) {
    logger.error('[Client Animal] Get batches failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches.',
    });
  }
};

// @desc    Get single animal
// @route   GET /api/animals/:id
// @access  Private (all client roles)
const getAnimal = async (req, res) => {
  try {
    const animal = await Animal.findOne({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!animal) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: animal,
    });
  } catch (error) {
    logger.error('[Client Animal] Get animal failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch animal.',
    });
  }
};

// @desc    Create animal
// @route   POST /api/animals
// @access  Private (farmAdmin, manager, worker)
const createAnimal = async (req, res) => {
  try {
    const { tag, breed, sex, birthDate, category, source, color, weight, dam, sire, pen, notes } = req.body;

    if (!tag || !breed || !sex || !category) {
      return res.status(400).json({
        success: false,
        message: 'Tag, breed, sex, and category are required.',
      });
    }

    const existing = await Animal.findOne({ farmId: req.farmId, tag });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An animal with this tag already exists.',
      });
    }

    const animal = await Animal.create({
      farmId: req.farmId,
      tag,
      breed,
      sex,
      birthDate,
      category,
      source,
      color,
      weight: weight ? { current: weight, lastUpdated: new Date() } : undefined,
      dam,
      sire,
      pen,
      notes,
    });

    logger.info('[Client Animal] Created', { animalId: animal._id, farmId: req.farmId });

    res.status(201).json({
      success: true,
      data: animal,
    });
  } catch (error) {
    logger.error('[Client Animal] Create failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create animal.',
    });
  }
};

// @desc    Batch create animals
// @route   POST /api/animals/batch
// @access  Private (farmAdmin, manager, worker)
const batchCreateAnimals = async (req, res) => {
  try {
    const { breed, sex, category, birthDate, color, quantity, tagPrefix, pen, notes } = req.body;

    if (!breed || !category || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Breed, category, and quantity are required.',
      });
    }

    const count = parseInt(quantity);
    if (isNaN(count) || count < 1 || count > 500) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be between 1 and 500.',
      });
    }

    const prefix = (tagPrefix || category.substring(0, 3).toUpperCase()).toUpperCase();
    const existingCount = await Animal.countDocuments({
      farmId: req.farmId,
      tag: new RegExp(`^${prefix}-\\d+$`, 'i'),
    });

    const batchId = `${prefix}-BATCH-${Date.now()}`;

    const animals = [];
    for (let i = 0; i < count; i++) {
      const tagNum = (existingCount + i + 1).toString().padStart(3, '0');
      animals.push({
        farmId: req.farmId,
        tag: `${prefix}-${tagNum}`,
        breed,
        sex: sex || 'female',
        category,
        birthDate: birthDate || new Date(),
        color: color || '',
        pen: pen || '',
        notes: notes || '',
        batchId,
        status: 'active',
      });
    }

    const created = await Animal.insertMany(animals);

    logger.info('[Client Animal] Batch created', {
      farmId: req.farmId,
      count: created.length,
      category,
      batchId,
    });

    res.status(201).json({
      success: true,
      message: `${created.length} animals created successfully.`,
      data: {
        count: created.length,
        batchId,
        tagRange: `${prefix}-${(existingCount + 1).toString().padStart(3, '0')} to ${prefix}-${(existingCount + count).toString().padStart(3, '0')}`,
        animals: created.slice(0, 10),
      },
    });
  } catch (error) {
    logger.error('[Client Animal] Batch create failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create animals.',
    });
  }
};

// @desc    Update animal
// @route   PUT /api/animals/:id
// @access  Private (farmAdmin, manager, worker)
const updateAnimal = async (req, res) => {
  try {
    const animal = await Animal.findOne({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!animal) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.',
      });
    }

    const { breed, birthDate, color, weight, status, group, pen, notes } = req.body;

    if (breed) animal.breed = breed;
    if (birthDate) animal.birthDate = birthDate;
    if (color) animal.color = color;
    if (weight) {
      animal.weight = { current: weight, unit: 'kg', lastUpdated: new Date() };
    }
    if (status) animal.status = status;
    if (group !== undefined) animal.group = group;
    if (pen !== undefined) animal.pen = pen;
    if (notes !== undefined) animal.notes = notes;
    animal.updatedAt = new Date();

    await animal.save();

    res.status(200).json({
      success: true,
      data: animal,
    });
  } catch (error) {
    logger.error('[Client Animal] Update failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update animal.',
    });
  }
};

// @desc    Permanently delete animal
// @route   DELETE /api/animals/:id
// @access  Private (farmAdmin only)
const deleteAnimal = async (req, res) => {
  try {
    const animal = await Animal.findOneAndDelete({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!animal) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.',
      });
    }

    await Promise.all([
      HealthRecord.deleteMany({ animalId: animal._id }),
      Vaccination.updateMany({ animalIds: animal._id }, { $pull: { animalIds: animal._id } }),
      Production.deleteMany({ animalId: animal._id }),
      Breeding.deleteMany({ animalId: animal._id }),
    ]);

    logger.info('[Client Animal] Permanently deleted', { animalId: animal._id });

    res.status(200).json({
      success: true,
      message: 'Animal permanently deleted.',
    });
  } catch (error) {
    logger.error('[Client Animal] Delete failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete animal.',
    });
  }
};

module.exports = {
  getAnimals,
  getAnimal,
  createAnimal,
  updateAnimal,
  batchCreateAnimals,
  getBatches,
  deleteAnimal,
};