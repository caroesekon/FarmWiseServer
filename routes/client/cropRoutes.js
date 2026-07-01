const router = require('express').Router();
const { getCrops, addCrop, harvestCrop } = require('../../controllers/client/cropController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getCrops);
router.post('/', roleCheck('farmAdmin', 'manager'), addCrop);
router.put('/:id/harvest', roleCheck('farmAdmin', 'manager', 'worker'), harvestCrop);

module.exports = router;