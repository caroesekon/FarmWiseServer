const router = require('express').Router();
const { getFarm, updateFarm } = require('../../controllers/client/farmController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getFarm);
router.put('/', roleCheck('farmAdmin'), updateFarm);

module.exports = router;