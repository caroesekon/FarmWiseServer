const axios = require('axios');
const Alert = require('../models/client/Alert');
const logger = require('../utils/logger');

const getCurrentForecast = async (location) => {
  try {
    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
      return { summary: 'Weather data unavailable', icon: 'unknown', high: null, low: null, rainfall: null, humidity: null, windSpeed: null };
    }

    let params;
    if (location?.lat && location?.lng) {
      params = { lat: location.lat, lon: location.lng, appid: apiKey, units: 'metric' };
    } else {
      params = { q: `${location?.county || 'Nairobi'},KE`, appid: apiKey, units: 'metric' };
    }

    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', { params });

    return {
      summary: response.data.weather[0].description,
      icon: response.data.weather[0].main.toLowerCase(),
      high: Math.round(response.data.main.temp_max),
      low: Math.round(response.data.main.temp_min),
      rainfall: response.data.rain ? response.data.rain['1h'] || 0 : 0,
      humidity: response.data.main.humidity,
      windSpeed: response.data.wind.speed,
      temp: Math.round(response.data.main.temp),
    };
  } catch (error) {
    logger.error('[Weather] Current fetch failed', { error: error.message });
    return { summary: 'Weather data unavailable', icon: 'unknown', high: null, low: null, rainfall: null, humidity: null, windSpeed: null };
  }
};

const getForecast = getCurrentForecast;

const getMultiDayForecast = async (location, days = 7) => {
  try {
    const lat = location?.lat || -1.2921;
    const lng = location?.lng || 36.8219;

    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lng,
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max,weather_code',
        timezone: 'Africa/Nairobi',
        forecast_days: Math.min(days, 16),
      },
    });

    const weatherCodes = {
      0: { summary: 'Clear sky', icon: 'clear' },
      1: { summary: 'Mainly clear', icon: 'clear' },
      2: { summary: 'Partly cloudy', icon: 'clouds' },
      3: { summary: 'Overcast', icon: 'clouds' },
      45: { summary: 'Foggy', icon: 'mist' },
      48: { summary: 'Depositing rime fog', icon: 'mist' },
      51: { summary: 'Light drizzle', icon: 'rain' },
      53: { summary: 'Moderate drizzle', icon: 'rain' },
      55: { summary: 'Dense drizzle', icon: 'rain' },
      61: { summary: 'Slight rain', icon: 'rain' },
      63: { summary: 'Moderate rain', icon: 'rain' },
      65: { summary: 'Heavy rain', icon: 'rain' },
      71: { summary: 'Slight snow', icon: 'snow' },
      73: { summary: 'Moderate snow', icon: 'snow' },
      75: { summary: 'Heavy snow', icon: 'snow' },
      80: { summary: 'Slight rain showers', icon: 'rain' },
      81: { summary: 'Moderate rain showers', icon: 'rain' },
      82: { summary: 'Violent rain showers', icon: 'rain' },
      95: { summary: 'Thunderstorm', icon: 'rain' },
      96: { summary: 'Thunderstorm with slight hail', icon: 'rain' },
      99: { summary: 'Thunderstorm with heavy hail', icon: 'rain' },
    };

    const forecast = response.data.daily.time.map((date, i) => {
      const code = response.data.daily.weather_code?.[i] || 0;
      const weather = weatherCodes[code] || { summary: 'Unknown', icon: 'clouds' };

      return {
        date,
        high: Math.round(response.data.daily.temperature_2m_max[i]),
        low: Math.round(response.data.daily.temperature_2m_min[i]),
        rainfall: response.data.daily.precipitation_sum[i],
        humidity: Math.round(response.data.daily.relative_humidity_2m_mean?.[i] || 0),
        windSpeed: Math.round(response.data.daily.wind_speed_10m_max[i] * 10) / 10,
        summary: weather.summary,
        icon: weather.icon,
      };
    });

    return forecast;
  } catch (error) {
    logger.error('[Weather] Multi-day forecast failed', { error: error.message });
    return [];
  }
};

const getSeasonalAdvisory = async (location) => {
  try {
    const month = new Date().getMonth();
    const county = location?.county || 'Nairobi';

    const seasonalData = {
      0: { season: 'Dry', advisory: `January in ${county}: Hot and dry conditions. Ensure adequate water for livestock. Good time for land preparation. Consider drought-resistant crops.` },
      1: { season: 'Dry', advisory: `February in ${county}: Continued dry spell. Monitor water sources. Start preparing nurseries for the upcoming rainy season.` },
      2: { season: 'Long Rains', advisory: `March in ${county}: Start of long rains. Ideal planting time for maize, beans, and vegetables. Ensure proper drainage in fields. Vaccinate livestock against common wet-season diseases.` },
      3: { season: 'Long Rains', advisory: `April in ${county}: Peak of long rains. Monitor for flooding in low-lying areas. Good time for top-dressing crops. Watch for pest outbreaks. Keep young animals sheltered.` },
      4: { season: 'Long Rains', advisory: `May in ${county}: Long rains tapering off. Continue weeding and pest control. Start harvesting early-planted crops. Good time for deworming livestock.` },
      5: { season: 'Dry', advisory: `June in ${county}: Cool and dry season beginning. Harvest main crops. Store hay and silage for dry season. Prepare for July cold spell.` },
      6: { season: 'Dry', advisory: `July in ${county}: Coolest month. Protect young animals from cold. Frost possible in highlands. Good time for pruning and field maintenance. Ensure animals have warm shelter at night.` },
      7: { season: 'Dry', advisory: `August in ${county}: Cool and dry. Continue field maintenance. Prepare for short rains planting. Review feed stocks for coming months.` },
      8: { season: 'Short Rains', advisory: `September in ${county}: Short rains begin. Good planting window for beans, vegetables, and short-season crops. Vaccinate poultry against Newcastle disease.` },
      9: { season: 'Short Rains', advisory: `October in ${county}: Short rains continue. Monitor crop growth. Good time for pasture renewal. Watch for increased parasite activity in livestock.` },
      10: { season: 'Short Rains', advisory: `November in ${county}: Short rains ending. Start harvesting short-season crops. Prepare for dry season. Stock up on feed and supplements.` },
      11: { season: 'Dry', advisory: `December in ${county}: Dry and warm. Holiday season — ensure farm staff coverage. Review year's performance. Plan for next year's planting. Good time for major farm maintenance.` },
    };

    const data = seasonalData[month] || { season: 'Unknown', advisory: `Current conditions for ${county}. Maintain regular farm operations.` };

    const forecast = await getMultiDayForecast(location, 7);
    const totalRainfall = forecast.reduce((sum, d) => sum + (d.rainfall || 0), 0);
    const avgHigh = forecast.length > 0 ? Math.round(forecast.reduce((sum, d) => sum + d.high, 0) / forecast.length) : null;

    let weeklyAdvisory = '';
    if (totalRainfall > 50) {
      weeklyAdvisory = 'Heavy rain expected this week. Delay spraying and ensure proper drainage. Move animals from low-lying areas.';
    } else if (totalRainfall > 20) {
      weeklyAdvisory = 'Moderate rain expected. Good for crops. Schedule vaccinations on dry days.';
    } else if (totalRainfall > 5) {
      weeklyAdvisory = 'Light showers expected. Continue normal operations. Good time for planting.';
    } else {
      weeklyAdvisory = 'Dry week ahead. Prioritize irrigation. Ensure adequate water for livestock.';
    }

    if (avgHigh && avgHigh > 32) {
      weeklyAdvisory += ' High temperatures expected — provide extra shade and water for animals.';
    }

    return {
      month: month + 1,
      season: data.season,
      advisory: data.advisory,
      weeklyAdvisory,
      weekAhead: { totalRainfall, avgHigh, daysWithRain: forecast.filter((d) => d.rainfall > 0).length },
    };
  } catch (error) {
    logger.error('[Weather] Seasonal advisory failed', { error: error.message });
    return { month: new Date().getMonth() + 1, season: 'Unknown', advisory: 'Weather advisory unavailable.', weeklyAdvisory: '', weekAhead: null };
  }
};

const getExtremeAlerts = async (location) => {
  try {
    const forecast = await getCurrentForecast(location);
    const alerts = [];

    if (forecast.high && forecast.high >= 35) {
      alerts.push({ type: 'heatwave', severity: 'critical', message: `Heatwave expected. High of ${forecast.high}°C. Provide extra water and shade.` });
    }
    if (forecast.rainfall && forecast.rainfall >= 50) {
      alerts.push({ type: 'heavy_rain', severity: 'high', message: `Heavy rain expected (${forecast.rainfall}mm). Move animals to higher ground.` });
    }
    if (forecast.low && forecast.low <= 2) {
      alerts.push({ type: 'frost', severity: 'critical', message: 'Frost warning. Protect sensitive crops and young animals.' });
    }

    return alerts;
  } catch (error) {
    logger.error('[Weather] Extreme alerts failed', { error: error.message });
    return [];
  }
};

const saveWeatherAlerts = async (farmId, location) => {
  try {
    const extremeAlerts = await getExtremeAlerts(location);
    for (const alert of extremeAlerts) {
      const existing = await Alert.findOne({
        farmId, type: 'weather',
        title: alert.type === 'heatwave' ? 'Heatwave Warning' : alert.type === 'heavy_rain' ? 'Heavy Rain Warning' : 'Frost Warning',
        status: 'active',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });
      if (!existing) {
        await Alert.create({
          farmId, type: 'weather',
          title: alert.type === 'heatwave' ? 'Heatwave Warning' : alert.type === 'heavy_rain' ? 'Heavy Rain Warning' : 'Frost Warning',
          description: alert.message, level: alert.severity, status: 'active',
        });
      }
    }
  } catch (error) {
    logger.error('[Weather] Save alerts failed', { error: error.message });
  }
};

module.exports = { getForecast, getMultiDayForecast, getSeasonalAdvisory, getExtremeAlerts, saveWeatherAlerts };