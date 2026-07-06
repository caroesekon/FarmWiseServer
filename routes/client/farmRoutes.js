const router = require('express').Router();
const { getFarm, updateFarm, getPrices,getProducts , updatePrices } = require('../../controllers/client/farmController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getFarm);
router.put('/', roleCheck('farmAdmin'), updateFarm);
router.get('/prices', getPrices);
router.put('/prices', roleCheck('farmAdmin'), updatePrices);
router.get('/products', getProducts);

module.exports = router;