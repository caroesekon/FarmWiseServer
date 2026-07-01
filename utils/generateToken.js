const jwt = require('jsonwebtoken');
const auth = require('../config/auth');

const generateClientToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    farmId: user.farmId,
  };

  return jwt.sign(payload, auth.jwt.clientSecret, {
    expiresIn: auth.jwt.clientExpiry,
  });
};

const generateAdminToken = (admin) => {
  const payload = {
    id: admin._id,
    email: admin.email,
    role: 'admin',
  };

  return jwt.sign(payload, auth.jwt.adminSecret, {
    expiresIn: auth.jwt.adminExpiry,
  });
};

const verifyClientToken = (token) => {
  return jwt.verify(token, auth.jwt.clientSecret);
};

const verifyAdminToken = (token) => {
  return jwt.verify(token, auth.jwt.adminSecret);
};

module.exports = {
  generateClientToken,
  generateAdminToken,
  verifyClientToken,
  verifyAdminToken,
};