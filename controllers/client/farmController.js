const Farm = require('../../models/client/Farm');
const User = require('../../models/client/User');
const logger = require('../../utils/logger');

// @desc    Get farm details
// @route   GET /api/client/farm
// @access  Private (all client roles)
const getFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.farmId);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: farm,
    });
  } catch (error) {
    logger.error('[Client Farm] Get farm failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farm details.',
    });
  }
};

// @desc    Update farm details
// @route   PUT /api/farm
// @access  Private (farmAdmin only)
const updateFarm = async (req, res) => {
  try {
    const { name, location, size, sizeUnit, livestock, crops } = req.body;

    const farm = await Farm.findById(req.farmId);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found.',
      });
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
    farm.updatedAt = new Date();

    await farm.save();

    logger.info('[Client Farm] Farm updated', { farmId: farm._id });

    res.status(200).json({
      success: true,
      message: 'Farm updated successfully.',
      data: farm,
    });
  } catch (error) {
    logger.error('[Client Farm] Update farm failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update farm.',
    });
  }
};

module.exports = {
  getFarm,
  updateFarm,
};