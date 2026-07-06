const router = require('express').Router();
const { recordProduction, getProduction, updateProduction, deleteProduction } = require('../../controllers/client/productionController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getProduction);
router.post('/', roleCheck('farmAdmin', 'manager', 'worker'), recordProduction);
router.put('/:id', roleCheck('farmAdmin', 'manager'), updateProduction);
router.delete('/:id', roleCheck('farmAdmin'), deleteProduction);

module.exports = router;