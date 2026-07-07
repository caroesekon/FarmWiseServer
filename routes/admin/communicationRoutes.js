const router = require('express').Router();
const { getUsers, sendEmail } = require('../../controllers/admin/communicationController');
const authenticateAdmin = require('../../middleware/admin/authenticateAdmin');
const auditLog = require('../../middleware/admin/auditLog');

router.use(authenticateAdmin);

router.get('/users', getUsers);
router.post('/send', auditLog('send_email'), sendEmail);

module.exports = router;