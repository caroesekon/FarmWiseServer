const router = require('express').Router();
const {
  getInventory,
  addItem,
  updateStock,
  deleteItem,
} = require('../../controllers/client/inventoryController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getInventory);
router.post('/', roleCheck('farmAdmin', 'manager'), addItem);
router.put('/:id/stock', roleCheck('farmAdmin', 'manager', 'worker'), updateStock);
router.delete('/:id', roleCheck('farmAdmin'), deleteItem);

module.exports = router;