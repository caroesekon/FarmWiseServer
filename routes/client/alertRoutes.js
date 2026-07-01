const router = require('express').Router();
const {
  getAlerts,
  acknowledgeAlert,
  dismissAlert,
} = require('../../controllers/client/alertController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getAlerts);
router.put('/:id/acknowledge', acknowledgeAlert);
router.put('/:id/dismiss', roleCheck('farmAdmin', 'manager'), dismissAlert);

module.exports = router;