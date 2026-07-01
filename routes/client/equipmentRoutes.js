const router = require('express').Router();
const {
  getEquipment,
  addEquipment,
  logMaintenance,
} = require('../../controllers/client/equipmentController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getEquipment);
router.post('/', roleCheck('farmAdmin', 'manager'), addEquipment);
router.post('/:id/maintenance', roleCheck('farmAdmin', 'manager'), logMaintenance);

module.exports = router;