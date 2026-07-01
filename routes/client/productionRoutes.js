const router = require('express').Router();
const {
  recordProduction,
  getProduction,
} = require('../../controllers/client/productionController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getProduction);
router.post('/', roleCheck('farmAdmin', 'manager', 'worker'), recordProduction);

module.exports = router;