const router = require('express').Router();
const { getFields, addField, updateField } = require('../../controllers/client/fieldController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getFields);
router.post('/', roleCheck('farmAdmin', 'manager'), addField);
router.put('/:id', roleCheck('farmAdmin', 'manager'), updateField);

module.exports = router;