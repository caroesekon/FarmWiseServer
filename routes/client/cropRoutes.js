const router = require('express').Router();
const { getCrops, addCrop, updateCrop, harvestCrop, deleteCrop } = require('../../controllers/client/cropController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getCrops);
router.post('/', roleCheck('farmAdmin', 'manager'), addCrop);
router.put('/:id', roleCheck('farmAdmin', 'manager'), updateCrop);
router.put('/:id/harvest', roleCheck('farmAdmin', 'manager', 'worker'), harvestCrop);
router.delete('/:id', roleCheck('farmAdmin'), deleteCrop);

module.exports = router;