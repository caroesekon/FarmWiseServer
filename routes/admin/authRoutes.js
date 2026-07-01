const router = require('express').Router();
const { login, getProfile } = require('../../controllers/admin/authController');
const authenticateAdmin = require('../../middleware/admin/authenticateAdmin');

router.post('/login', login);
router.get('/profile', authenticateAdmin, getProfile);

module.exports = router;