const router = require('express').Router();
const {
  getMetrics, getConfig, updateConfig, toggleMaintenance, getDownloads, updateDownloads,
} = require('../../controllers/admin/systemController');
const authenticateAdmin = require('../../middleware/admin/authenticateAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(authenticateAdmin);

router.get('/metrics', getMetrics);
router.get('/config', getConfig);
router.put('/config', auditLog('update_config'), updateConfig);
router.post('/maintenance', auditLog('toggle_maintenance'), toggleMaintenance);
router.get('/downloads', getDownloads);
router.put('/downloads', auditLog('update_downloads'), updateDownloads);

module.exports = router;