const axios = require('axios');
const Alert = require('../models/client/Alert');
const logger = require('../utils/logger');

const getForecast = async (location) => {
  try {
    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
      return {
        summary: 'Weather data unavailable',
        icon: 'unknown',
        high: null,
        low: null,
        rainfall: null,
        alerts: [],
      };
    }

    if (!location || !location.lat || !location.lng) {
      const response = await axios.get(
        'https://api.openweathermap.org/data/2.5/weather',
        {
          params: {
            q: `${location?.county || 'Nairobi'},KE`,
            appid: apiKey,
            units: 'metric',
          },
        }
      );

      return {
        summary: response.data.weather[0].description,
        icon: response.data.weather[0].main.toLowerCase(),
        high: Math.round(response.data.main.temp_max),
        low: Math.round(response.data.main.temp_min),
        rainfall: response.data.rain ? response.data.rain['1h'] || 0 : 0,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed,
      };
    }

    const response = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          lat: location.lat,
          lon: location.lng,
          appid: apiKey,
          units: 'metric',
        },
      }
    );

    return {
      summary: response.data.weather[0].description,
      icon: response.data.weather[0].main.toLowerCase(),
      high: Math.round(response.data.main.temp_max),
      low: Math.round(response.data.main.temp_min),
      rainfall: response.data.rain ? response.data.rain['1h'] || 0 : 0,
      humidity: response.data.main.humidity,
      windSpeed: response.data.wind.speed,
    };
  } catch (error) {
    logger.error('[Weather] Failed to fetch forecast', { error: error.message });
    return {
      summary: 'Weather data unavailable',
      icon: 'unknown',
      high: null,
      low: null,
      rainfall: null,
      alerts: [],
    };
  }
};

const getExtremeAlerts = async (location) => {
  try {
    const forecast = await getForecast(location);
    return checkForExtremeWeather(forecast);
  } catch (error) {
    logger.error('[Weather] Failed to check extreme alerts', { error: error.message });
    return [];
  }
};

const checkForExtremeWeather = (forecast) => {
  const alerts = [];

  if (forecast.high && forecast.high >= 35) {
    alerts.push({
      type: 'heatwave',
      severity: 'critical',
      message: `Heatwave expected. High of ${forecast.high}°C. Provide extra water and shade.`,
    });
  }

  if (forecast.rainfall && forecast.rainfall >= 50) {
    alerts.push({
      type: 'heavy_rain',
      severity: 'high',
      message: `Heavy rain expected (${forecast.rainfall}mm). Move animals to higher ground.`,
    });
  }

  if (forecast.low && forecast.low <= 2) {
    alerts.push({
      type: 'frost',
      severity: 'critical',
      message: 'Frost warning. Protect sensitive crops and young animals.',
    });
  }

  return alerts;
};

const saveWeatherAlerts = async (farmId, location) => {
  try {
    const extremeAlerts = await getExtremeAlerts(location);

    for (const alert of extremeAlerts) {
      const existing = await Alert.findOne({
        farmId,
        type: 'weather',
        title: alert.type === 'heatwave' ? 'Heatwave Warning' : alert.type === 'heavy_rain' ? 'Heavy Rain Warning' : 'Frost Warning',
        status: 'active',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      if (!existing) {
        await Alert.create({
          farmId,
          type: 'weather',
          title: alert.type === 'heatwave' ? 'Heatwave Warning' : alert.type === 'heavy_rain' ? 'Heavy Rain Warning' : 'Frost Warning',
          description: alert.message,
          level: alert.severity,
          status: 'active',
        });
        logger.info('[Weather] Alert saved', { farmId, type: alert.type });
      }
    }
  } catch (error) {
    logger.error('[Weather] Failed to save alerts', { error: error.message });
  }
};

module.exports = { getForecast, getExtremeAlerts, saveWeatherAlerts };