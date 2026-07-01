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

module.exports = router;