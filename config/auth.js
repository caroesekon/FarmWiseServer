module.exports = {
  // JWT secrets
  jwt: {
    clientSecret: process.env.JWT_CLIENT_SECRET,
    clientExpiry: process.env.JWT_CLIENT_EXPIRY || '7d',

    adminSecret: process.env.JWT_ADMIN_SECRET,
    adminExpiry: process.env.JWT_ADMIN_EXPIRY || '4h',
  },

  // Password hashing
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
  },

  // Admin access key
  accessKey: {
    expiryHours: parseInt(process.env.ADMIN_ACCESS_KEY_EXPIRY_HOURS) || 24,
    maxAttempts: parseInt(process.env.ADMIN_MAX_ATTEMPTS) || 5,
    windowMinutes: parseInt(process.env.ADMIN_RATE_WINDOW_MINUTES) || 15,
  },
};