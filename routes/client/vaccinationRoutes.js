const router = require('express').Router();
const { getVaccinations, getVets, scheduleVaccination, updateVaccination, completeVaccination, deleteVaccination } = require('../../controllers/client/vaccinationController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getVaccinations);
router.get('/vets', getVets);
router.post('/', roleCheck('farmAdmin', 'manager', 'vet'), scheduleVaccination);
router.put('/:id', roleCheck('farmAdmin', 'manager', 'vet'), updateVaccination);
router.put('/:id/complete', roleCheck('farmAdmin', 'manager', 'vet'), completeVaccination);
router.delete('/:id', roleCheck('farmAdmin'), deleteVaccination);

module.exports = router;