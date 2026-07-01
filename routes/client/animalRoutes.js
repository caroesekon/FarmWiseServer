const router = require('express').Router();
const {
  getAnimals,
  getAnimal,
  createAnimal,
  updateAnimal,
  batchCreateAnimals,
  getBatches,
  deleteAnimal,
} = require('../../controllers/client/animalController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getAnimals);
router.get('/batches', getBatches);
router.get('/:id', getAnimal);
router.post('/', roleCheck('farmAdmin', 'manager', 'worker'), createAnimal);
router.post('/batch', roleCheck('farmAdmin', 'manager', 'worker'), batchCreateAnimals);
router.put('/:id', roleCheck('farmAdmin', 'manager', 'worker'), updateAnimal);
router.delete('/:id', roleCheck('farmAdmin'), deleteAnimal);

module.exports = router;