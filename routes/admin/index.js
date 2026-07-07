const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/system', require('./systemRoutes'));
router.use('/backups', require('./backupRoutes'));
router.use('/communication', require('./communicationRoutes'));

module.exports = router;