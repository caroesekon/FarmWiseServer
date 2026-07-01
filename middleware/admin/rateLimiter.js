const auth = require('../../config/auth');
const logger = require('../../utils/logger');

const attempts = new Map();

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = auth.accessKey.windowMinutes * 60 * 1000;
  const maxAttempts = auth.accessKey.maxAttempts;

  if (!attempts.has(ip)) {
    attempts.set(ip, []);
  }

  const userAttempts = attempts.get(ip).filter(
    (timestamp) => now - timestamp < windowMs
  );

  if (userAttempts.length >= maxAttempts) {
    const retryAfter = Math.ceil((userAttempts[0] + windowMs - now) / 1000 / 60);

    logger.warn('[Rate Limiter] Blocked', { ip, attempts: userAttempts.length });

    return res.status(429).json({
      success: false,
      message: `Too many attempts. Try again in ${retryAfter} minutes.`,
      retryAfterMinutes: retryAfter,
    });
  }

  userAttempts.push(now);
  attempts.set(ip, userAttempts);

  next();
};

const clearRateLimit = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  attempts.delete(ip);
};

module.exports = { rateLimiter, clearRateLimit };