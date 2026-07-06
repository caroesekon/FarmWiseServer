const weatherService = require('../../services/weatherService');
const Farm = require('../../models/client/Farm');
const logger = require('../../utils/logger');

// @desc    Get current weather + forecast
// @route   GET /api/weather
// @access  Private (all client roles)
const getWeather = async (req, res) => {
  try {
    const farm = await Farm.findById(req.farmId);
    if (!farm?.location) {
      return res.status(400).json({ success: false, message: 'Farm location not set.' });
    }

    const forecast = await weatherService.getForecast(farm.location);
    const extremeAlerts = await weatherService.getExtremeAlerts(farm.location);
    const multiDay = await weatherService.getMultiDayForecast(farm.location, 7);

    res.status(200).json({
      success: true,
      data: { current: forecast, forecast: multiDay, extremeAlerts },
    });
  } catch (error) {
    logger.error('[Client Weather] Get failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch weather.' });
  }
};

// @desc    Get multi-day forecast
// @route   GET /api/weather/forecast?days=7
// @access  Private (all client roles)
const getForecast = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const farm = await Farm.findById(req.farmId);
    if (!farm?.location) {
      return res.status(400).json({ success: false, message: 'Farm location not set.' });
    }

    const forecast = await weatherService.getMultiDayForecast(farm.location, parseInt(days));

    res.status(200).json({ success: true, data: forecast });
  } catch (error) {
    logger.error('[Client Weather] Forecast failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch forecast.' });
  }
};

// @desc    Get seasonal advisory
// @route   GET /api/weather/seasonal
// @access  Private (all client roles)
const getSeasonal = async (req, res) => {
  try {
    const farm = await Farm.findById(req.farmId);
    if (!farm?.location) {
      return res.status(400).json({ success: false, message: 'Farm location not set.' });
    }

    const advisory = await weatherService.getSeasonalAdvisory(farm.location);

    res.status(200).json({ success: true, data: advisory });
  } catch (error) {
    logger.error('[Client Weather] Seasonal failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch seasonal advisory.' });
  }
};

module.exports = { getWeather, getForecast, getSeasonal };