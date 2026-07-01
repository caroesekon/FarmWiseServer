const crypto = require('crypto');

/**
 * Hashes a raw access key using SHA-256
 * Used for storing admin access keys securely
 */
const hashKey = (rawKey) => {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

/**
 * Generates a cryptographically secure random key
 */
const generateRawKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generates a shorter URL-friendly hash
 */
const generateUrlHash = (length = 16) => {
  return crypto.randomBytes(length / 2).toString('hex');
};

/**
 * Constant-time comparison to prevent timing attacks
 */
const compareKeys = (rawKey, hashedKey) => {
  const hash = hashKey(rawKey);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedKey));
};

module.exports = {
  hashKey,
  generateRawKey,
  generateUrlHash,
  compareKeys,
};