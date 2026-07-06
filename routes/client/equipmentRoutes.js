const router = require('express').Router();
const { getEquipment, addEquipment, updateEquipment, logMaintenance, deleteEquipment } = require('../../controllers/client/equipmentController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getEquipment);
router.post('/', roleCheck('farmAdmin', 'manager'), addEquipment);
router.put('/:id', roleCheck('farmAdmin', 'manager'), updateEquipment);
router.post('/:id/maintenance', roleCheck('farmAdmin', 'manager'), logMaintenance);
router.delete('/:id', roleCheck('farmAdmin'), deleteEquipment);

module.exports = router;