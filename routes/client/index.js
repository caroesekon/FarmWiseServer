const router = require('express').Router();
const authenticateUser = require('../../middleware/client/authenticateUser');
const farmIsolation = require('../../middleware/client/farmIsolation');
const trialCheck = require('../../middleware/client/trialCheck');

router.use('/auth', require('./authRoutes'));

router.use(authenticateUser);
router.use(farmIsolation);
router.use(trialCheck);

router.use('/farm', require('./farmRoutes'));
router.use('/team', require('./teamRoutes'));
router.use('/animals', require('./animalRoutes'));
router.use('/health', require('./healthRoutes'));
router.use('/vaccinations', require('./vaccinationRoutes'));
router.use('/production', require('./productionRoutes'));
router.use('/breeding', require('./breedingRoutes'));
router.use('/inventory', require('./inventoryRoutes'));
router.use('/equipment', require('./equipmentRoutes'));
router.use('/finance', require('./financeRoutes'));
router.use('/fields', require('./fieldRoutes'));
router.use('/crops', require('./cropRoutes'));
router.use('/tasks', require('./taskRoutes'));
router.use('/alerts', require('./alertRoutes'));
router.use('/ai', require('./aiRoutes'));
router.use('/weather', require('./weatherRoutes'));
router.use('/briefing', require('./briefingRoutes'));

module.exports = router;