const router = require('express').Router();
const { getHealthRecords, addHealthRecord, updateHealthRecord, deleteHealthRecord } = require('../../controllers/client/healthController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getHealthRecords);
router.post('/', roleCheck('farmAdmin', 'manager', 'vet'), addHealthRecord);
router.put('/:id', roleCheck('farmAdmin', 'manager', 'vet'), updateHealthRecord);
router.delete('/:id', roleCheck('farmAdmin'), deleteHealthRecord);

module.exports = router;