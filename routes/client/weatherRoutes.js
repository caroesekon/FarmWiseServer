const router = require('express').Router();
const { getWeather } = require('../../controllers/client/weatherController');

router.get('/', getWeather);

module.exports = router;