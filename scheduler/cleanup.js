const AdminAccess = require('../models/admin/AdminAccess');
const logger = require('../utils/logger');

const run = async () => {
  logger.info('[Cleanup] Starting weekly cleanup');

  try {
    const expiredKeys = await AdminAccess.deleteMany({
      expiresAt: { $lt: new Date() },
      used: false,
    });
    logger.info(`[Cleanup] Removed ${expiredKeys.deletedCount} expired access keys`);
  } catch (error) {
    logger.error('[Cleanup] Access key cleanup failed', { error: error.message });
  }

  try {
    const oldUsedKeys = await AdminAccess.deleteMany({
      used: true,
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    logger.info(`[Cleanup] Removed ${oldUsedKeys.deletedCount} old used keys`);
  } catch (error) {
    logger.error('[Cleanup] Old key cleanup failed', { error: error.message });
  }
};

module.exports = { run };