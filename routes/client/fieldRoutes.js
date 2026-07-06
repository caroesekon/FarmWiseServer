const router = require('express').Router();
const { getFields, addField, updateField, deleteField } = require('../../controllers/client/fieldController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getFields);
router.post('/', roleCheck('farmAdmin', 'manager'), addField);
router.put('/:id', roleCheck('farmAdmin', 'manager'), updateField);
router.delete('/:id', roleCheck('farmAdmin'), deleteField);

module.exports = router;