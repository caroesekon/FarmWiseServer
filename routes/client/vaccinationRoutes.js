const router = require('express').Router();
const {
  getVaccinations,
  getVets,
  scheduleVaccination,
  completeVaccination,
} = require('../../controllers/client/vaccinationController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getVaccinations);
router.get('/vets', getVets);
router.post('/', roleCheck('farmAdmin', 'manager', 'vet'), scheduleVaccination);
router.put('/:id/complete', roleCheck('farmAdmin', 'manager', 'vet'), completeVaccination);

module.exports = router;