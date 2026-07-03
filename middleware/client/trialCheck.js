const Farm = require('../../models/client/Farm');
const logger = require('../../utils/logger');

const trialCheck = async (req, res, next) => {
  try {
    const skipPaths = [
      '/auth/login',
      '/auth/profile',
      '/auth/forgot-password',
    ];

    if (skipPaths.some((p) => req.path.startsWith(p))) {
      return next();
    }

    const farm = await Farm.findById(req.farmId);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found.',
      });
    }

    if (farm.trialStatus === 'expired') {
      return res.status(403).json({
        success: false,
        message: 'Your free trial has ended. Please contact the administrator to continue using FarmWise.',
        code: 'TRIAL_EXPIRED',
      });
    }

    if (farm.trialStatus === 'trial' && farm.trialEndsAt) {
      if (new Date() > new Date(farm.trialEndsAt)) {
        farm.trialStatus = 'expired';
        farm.updatedAt = new Date();
        await farm.save();

        logger.info('[Trial] Trial expired', { farmId: farm._id });

        return res.status(403).json({
          success: false,
          message: 'Your free trial has ended. Please contact the administrator to continue using FarmWise.',
          code: 'TRIAL_EXPIRED',
        });
      }
    }

    if (farm.trialStatus === 'none') {
      return next();
    }

    next();
  } catch (error) {
    logger.error('[Trial Check] Failed', { error: error.message });
    next();
  }
};

module.exports = trialCheck;