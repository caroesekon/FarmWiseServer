const router = require('express').Router();
const { getWeather, getForecast, getSeasonal } = require('../../controllers/client/weatherController');

router.get('/', getWeather);
router.get('/forecast', getForecast);
router.get('/seasonal', getSeasonal);

module.exports = router;