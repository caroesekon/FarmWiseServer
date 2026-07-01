const { verifyClientToken } = require('../../utils/generateToken');
const logger = require('../../utils/logger');

const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyClientToken(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      phone: decoded.phone,
      role: decoded.role,
      farmId: decoded.farmId,
    };

    next();
  } catch (error) {
    logger.warn('[Client Auth] Failed', { error: error.message });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.',
      code: 'INVALID_TOKEN',
    });
  }
};

module.exports = authenticateUser;