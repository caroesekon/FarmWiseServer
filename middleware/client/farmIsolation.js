const logger = require('../../utils/logger');

const farmIsolation = (req, res, next) => {
  if (req.admin) {
    return next();
  }

  if (!req.user || !req.user.farmId) {
    logger.warn('[Farm Isolation] No farmId in token', { userId: req.user?.id });
    return res.status(403).json({
      success: false,
      message: 'No farm associated with this account.',
    });
  }

  req.farmId = req.user.farmId;

  next();
};

module.exports = farmIsolation;