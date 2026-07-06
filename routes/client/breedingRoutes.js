const router = require('express').Router();
const { getBreedingRecords, addBreedingEvent, updateBreedingEvent, deleteBreedingEvent } = require('../../controllers/client/breedingController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getBreedingRecords);
router.post('/', roleCheck('farmAdmin', 'manager', 'vet'), addBreedingEvent);
router.put('/:id', roleCheck('farmAdmin', 'manager', 'vet'), updateBreedingEvent);
router.delete('/:id', roleCheck('farmAdmin'), deleteBreedingEvent);

module.exports = router;