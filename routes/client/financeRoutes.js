const router = require('express').Router();
const {
  getFinances,
  addRecord,
  deleteRecord,
} = require('../../controllers/client/financeController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', roleCheck('farmAdmin', 'manager'), getFinances);
router.post('/', roleCheck('farmAdmin', 'manager'), addRecord);
router.delete('/:id', roleCheck('farmAdmin'), deleteRecord);

module.exports = router;