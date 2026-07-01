const weatherService = require('../../services/weatherService');
const Farm = require('../../models/client/Farm');
const logger = require('../../utils/logger');

// @desc    Get weather for farm
// @route   GET /api/client/weather
// @access  Private (all client roles)
const getWeather = async (req, res) => {
  try {
    const farm = await Farm.findById(req.farmId);

    if (!farm || !farm.location) {
      return res.status(400).json({
        success: false,
        message: 'Farm location not set.',
      });
    }

    const forecast = await weatherService.getForecast(farm.location);
    const extremeAlerts = await weatherService.getExtremeAlerts(farm.location);

    res.status(200).json({
      success: true,
      data: {
        forecast,
        extremeAlerts,
      },
    });
  } catch (error) {
    logger.error('[Client Weather] Get failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather.',
    });
  }
};

module.exports = {
  getWeather,
};