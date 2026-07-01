const router = require('express').Router();
const {
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
} = require('../../controllers/client/authController');
const authenticateUser = require('../../middleware/client/authenticateUser');
const farmIsolation = require('../../middleware/client/farmIsolation');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);

router.use(authenticateUser);
router.use(farmIsolation);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);

module.exports = router;