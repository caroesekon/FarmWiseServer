const AdminAccess = require('../../models/admin/AdminAccess');
const { generateAdminToken } = require('../../utils/generateToken');
const logger = require('../../utils/logger');

// @desc    Login super admin
// @route   POST /api/admin/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const admin = await AdminAccess.findOne({
      email: email.toLowerCase(),
      status: 'active',
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateAdminToken(admin);

    logger.info('[Admin Auth] Login successful', { adminId: admin._id });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('[Admin Auth] Login failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    });
  }
};

// @desc    Get current admin profile
// @route   GET /api/admin/auth/profile
// @access  Private (admin)
const getProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.admin,
  });
};

module.exports = {
  login,
  getProfile,
};