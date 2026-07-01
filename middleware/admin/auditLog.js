const logger = require('../../utils/logger');

const auditLog = (action, details = {}) => {
  return (req, res, next) => {
    const originalEnd = res.end;

    res.end = function (...args) {
      const logEntry = {
        adminId: req.admin?.id || 'unknown',
        adminEmail: req.admin?.email || 'unknown',
        action,
        method: req.method,
        endpoint: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        details,
        statusCode: res.statusCode,
        timestamp: new Date(),
      };

      logger.info(`[AUDIT] ${action}`, logEntry);

      originalEnd.apply(res, args);
    };

    next();
  };
};

module.exports = auditLog;