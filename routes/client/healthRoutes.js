const router = require('express').Router();
const {
  getHealthRecords,
  addHealthRecord,
} = require('../../controllers/client/healthController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getHealthRecords);
router.post('/', roleCheck('farmAdmin', 'manager', 'vet'), addHealthRecord);

module.exports = router;