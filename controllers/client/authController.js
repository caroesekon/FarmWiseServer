const User = require('../../models/client/User');
const Farm = require('../../models/client/Farm');
const { generateClientToken } = require('../../utils/generateToken');
const generatePassword = require('../../utils/generatePassword');
const { normalizePhone } = require('../../utils/validators');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

// @desc    Login user
// @route   POST /api/client/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone is required.',
      });
    }

    const query = {};
    if (email) query.email = email.toLowerCase();
    if (phone) query.phone = normalizePhone(phone);

    const user = await User.findOne({ ...query, status: 'active' });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateClientToken(user);

    const farm = await Farm.findById(user.farmId).select('name');

    logger.info('[Client Auth] Login successful', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          preferences: user.preferences,
        },
        farm: farm || null,
        token,
      },
    });
  } catch (error) {
    logger.error('[Client Auth] Login failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/client/auth/profile
// @access  Private (all client roles)
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const farm = await Farm.findById(user.farmId);

    res.status(200).json({
      success: true,
      data: {
        user,
        farm,
      },
    });
  } catch (error) {
    logger.error('[Client Auth] Get profile failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile.',
    });
  }
};

// @desc    Update profile
// @route   PUT /api/client/auth/profile
// @access  Private (all client roles)
const updateProfile = async (req, res) => {
  try {
    const { name, preferences } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (preferences) {
      user.preferences = {
        ...user.preferences,
        ...preferences,
      };
    }
    user.updatedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    logger.error('[Client Auth] Update profile failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
    });
  }
};

// @desc    Change password
// @route   PUT /api/client/auth/password
// @access  Private (all client roles)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters.',
      });
    }

    const user = await User.findById(req.user.id);

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();

    logger.info('[Client Auth] Password changed', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    logger.error('[Client Auth] Change password failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to change password.',
    });
  }
};

// @desc    Request password reset (forgot password)
// @route   POST /api/client/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), status: 'active' });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      });
    }

    const newPassword = generatePassword();
    user.password = newPassword;
    await user.save();

    await emailService.send({
      to: user.email,
      template: 'passwordReset',
      data: {
        name: user.name,
        password: newPassword,
        loginUrl: process.env.CLIENT_URL,
      },
    });

    res.status(200).json({
      success: true,
      message: 'If the email exists, a reset link has been sent.',
    });
  } catch (error) {
    logger.error('[Client Auth] Forgot password failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to process request.',
    });
  }
};

module.exports = {
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
};