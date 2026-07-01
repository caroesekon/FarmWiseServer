const router = require('express').Router();

const adminRoutes = require('./admin/index');
const clientRoutes = require('./client/index');

router.use('/admin', adminRoutes);
router.use('/', clientRoutes);

module.exports = router;