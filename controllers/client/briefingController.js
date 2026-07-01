const briefingService = require('../../services/briefingService');
const Farm = require('../../models/client/Farm');
const logger = require('../../utils/logger');

// @desc    Get daily briefing
// @route   GET /api/client/briefing
// @access  Private (all client roles)
const getBriefing = async (req, res) => {
  try {
    const farm = await Farm.findById(req.farmId);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found.',
      });
    }

    const briefing = await briefingService.compileBriefing(farm);

    res.status(200).json({
      success: true,
      data: briefing,
    });
  } catch (error) {
    logger.error('[Client Briefing] Get failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to compile briefing.',
    });
  }
};

module.exports = {
  getBriefing,
};