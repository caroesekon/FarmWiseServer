const Farm = require('../../models/client/Farm');
const User = require('../../models/client/User');
const logger = require('../../utils/logger');
const Animal = require('../../models/client/Animal');
const Crop = require('../../models/client/Crop');

// @desc    Get farm details
// @route   GET /api/farm
// @access  Private (all client roles)
const getFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.farmId);

    if (!farm) {
      return res.status(404).json({ success: false, message: 'Farm not found.' });
    }

    res.status(200).json({ success: true, data: farm });
  } catch (error) {
    logger.error('[Client Farm] Get farm failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch farm details.' });
  }
};

// @desc    Update farm details
// @route   PUT /api/farm
// @access  Private (farmAdmin only)
const updateFarm = async (req, res) => {
  try {
    const { name, location, size, sizeUnit, livestock, crops, productPrices } = req.body;

    const farm = await Farm.findById(req.farmId);

    if (!farm) {
      return res.status(404).json({ success: false, message: 'Farm not found.' });
    }

    if (name) farm.name = name;
    if (location) {
      farm.location = {
        county: location.county || farm.location?.county || '',
        subCounty: location.subCounty || farm.location?.subCounty || '',
        ward: location.ward || farm.location?.ward || '',
        lat: location.lat || farm.location?.lat || null,
        lng: location.lng || farm.location?.lng || null,
      };
    }
    if (size !== undefined) farm.size = size;
    if (sizeUnit) farm.sizeUnit = sizeUnit;
    if (livestock) farm.livestock = livestock;
    if (crops) farm.crops = crops;
    if (productPrices) farm.productPrices = productPrices;
    farm.updatedAt = new Date();

    await farm.save();

    logger.info('[Client Farm] Farm updated', { farmId: farm._id });

    res.status(200).json({ success: true, message: 'Farm updated successfully.', data: farm });
  } catch (error) {
    logger.error('[Client Farm] Update farm failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update farm.' });
  }
};

// @desc    Get product prices
// @route   GET /api/farm/prices
// @access  Private (all client roles)
const getPrices = async (req, res) => {
  try {
    const farm = await Farm.findById(req.farmId).select('productPrices');

    res.status(200).json({
      success: true,
      data: farm?.productPrices || [],
    });
  } catch (error) {
    logger.error('[Client Farm] Get prices failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch prices.' });
  }
};

// @desc    Update product prices
// @route   PUT /api/farm/prices
// @access  Private (farmAdmin only)
const updatePrices = async (req, res) => {
  try {
    const { productPrices } = req.body;

    if (!Array.isArray(productPrices)) {
      return res.status(400).json({ success: false, message: 'productPrices must be an array.' });
    }

    const farm = await Farm.findById(req.farmId);
    farm.productPrices = productPrices;
    farm.updatedAt = new Date();
    await farm.save();

    logger.info('[Client Farm] Prices updated', { farmId: farm._id });

    res.status(200).json({ success: true, message: 'Prices updated.', data: farm.productPrices });
  } catch (error) {
    logger.error('[Client Farm] Update prices failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update prices.' });
  }
};

// @desc    Get farm products (animals + crops)
// @route   GET /api/farm/products
// @access  Private (all client roles)
const getProducts = async (req, res) => {
  try {
    const farm = await Farm.findById(req.farmId).select('livestock crops');
    const animals = await Animal.find({ farmId: req.farmId, status: 'active' }).select('category');

    const products = [];

    const animalCategories = [...new Set(animals.map((a) => a.category))];

    if (animalCategories.includes('dairyCattle') || animalCategories.includes('beefCattle')) {
      products.push({ name: 'Milk per Litre', category: 'animal', price: '', unit: 'L' });
      products.push({ name: 'Beef per Kg', category: 'animal', price: '', unit: 'kg' });
    }
    if (animalCategories.includes('poultry')) {
      products.push({ name: 'Eggs per Tray', category: 'animal', price: '', unit: 'tray' });
      products.push({ name: 'Eggs per Piece', category: 'animal', price: '', unit: 'pcs' });
      products.push({ name: 'Chicken per Bird', category: 'animal', price: '', unit: 'bird' });
    }
    if (animalCategories.includes('goats')) {
      products.push({ name: 'Goat per Head', category: 'animal', price: '', unit: 'head' });
      products.push({ name: 'Goat Milk per Litre', category: 'animal', price: '', unit: 'L' });
    }
    if (animalCategories.includes('sheep')) {
      products.push({ name: 'Sheep per Head', category: 'animal', price: '', unit: 'head' });
      products.push({ name: 'Wool per Kg', category: 'animal', price: '', unit: 'kg' });
    }
    if (animalCategories.includes('pigs')) {
      products.push({ name: 'Pork per Kg', category: 'animal', price: '', unit: 'kg' });
    }

    const crops = farm?.crops || [];
    crops.forEach((crop) => {
      if (typeof crop === 'string') {
        products.push({ name: `${crop} per Bag`, category: 'crop', price: '', unit: 'bag' });
      }
    });

    const cropRecords = await Crop.find({ farmId: req.farmId }).select('cropType');
    const cropTypes = [...new Set(cropRecords.map((c) => c.cropType))];
    cropTypes.forEach((ct) => {
      if (!products.find((p) => p.name.includes(ct))) {
        products.push({ name: `${ct} per Bag`, category: 'crop', price: '', unit: 'bag' });
      }
    });

    if (products.length === 0) {
      products.push(
        { name: 'Milk per Litre', category: 'animal', price: '', unit: 'L' },
        { name: 'Eggs per Tray', category: 'animal', price: '', unit: 'tray' },
        { name: 'Maize per Bag', category: 'crop', price: '', unit: 'bag' },
      );
    }

    res.status(200).json({ success: true, data: products });
  } catch (error) {
    logger.error('[Client Farm] Get products failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
};

module.exports = { getFarm, updateFarm, getPrices, updatePrices, getProducts };