const router = require('express').Router();
const { getBriefing } = require('../../controllers/client/briefingController');

router.get('/', getBriefing);

module.exports = router;