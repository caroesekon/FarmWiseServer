const router = require('express').Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  resetPassword,
  suspendUser,
  activateUser,
  deleteUser,
  startTrial,
  extendTrial,
  convertToFull,
} = require('../../controllers/admin/userController');
const authenticateAdmin = require('../../middleware/admin/authenticateAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(authenticateAdmin);

router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', auditLog('create_user'), createUser);
router.put('/:id', auditLog('update_user'), updateUser);
router.post('/:id/reset-password', auditLog('reset_password'), resetPassword);
router.post('/:id/suspend', auditLog('suspend_user'), suspendUser);
router.post('/:id/activate', auditLog('activate_user'), activateUser);
router.delete('/:id', auditLog('delete_user'), deleteUser);
router.post('/:id/trial', auditLog('start_trial'), startTrial);
router.post('/:id/trial/extend', auditLog('extend_trial'), extendTrial);
router.post('/:id/convert', auditLog('convert_trial'), convertToFull);

module.exports = router;