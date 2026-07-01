const router = require('express').Router();
const multer = require('multer');
const {
  createBackup,
  listBackups,
  downloadBackup,
  emailBackup,
  deleteBackup,
  restoreBackup,
  uploadBackup,
  getConfig,
  updateConfig,
} = require('../../controllers/admin/backupController');
const authenticateAdmin = require('../../middleware/admin/authenticateAdmin');
const auditLog = require('../../middleware/admin/auditLog');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.use(authenticateAdmin);

router.post('/create', auditLog('create_backup'), createBackup);
router.get('/', listBackups);
router.get('/config', getConfig);
router.put('/config', auditLog('update_backup_config'), updateConfig);
router.get('/:filename', downloadBackup);
router.post('/:filename/email', auditLog('email_backup'), emailBackup);
router.post('/:filename/restore', auditLog('restore_backup'), restoreBackup);
router.delete('/:filename', auditLog('delete_backup'), deleteBackup);
router.post('/upload', upload.single('backup'), auditLog('upload_backup'), uploadBackup);

module.exports = router;