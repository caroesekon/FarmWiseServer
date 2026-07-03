const User = require('../../models/client/User');
const Farm = require('../../models/client/Farm');
const generatePassword = require('../../utils/generatePassword');
const { normalizePhone, isValidEmail } = require('../../utils/validators');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

// @desc    Get all farm admin accounts
// @route   GET /api/admin/users
// @access  Private (admin)
const getUsers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = { role: 'farmAdmin' };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    const usersWithFarms = await Promise.all(
      users.map(async (user) => {
        const farm = await Farm.findOne({ owner: user._id }).select('name location trialStatus trialEndsAt');
        return {
          ...user.toObject(),
          farmName: farm?.name || 'No farm',
          farmLocation: farm?.location || null,
          trialStatus: farm?.trialStatus || 'none',
          trialEndsAt: farm?.trialEndsAt || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: usersWithFarms,
    });
  } catch (error) {
    logger.error('[Admin] Get users failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
    });
  }
};

// @desc    Get single farm admin
// @route   GET /api/admin/users/:id
// @access  Private (admin)
const getUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: 'farmAdmin',
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const farm = await Farm.findOne({ owner: user._id }).select('name location size sizeUnit livestock crops status trialStatus trialStartsAt trialEndsAt');

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        farm: farm || null,
      },
    });
  } catch (error) {
    logger.error('[Admin] Get user failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user.',
    });
  }
};

// @desc    Create farm admin + farm
// @route   POST /api/admin/users
// @access  Private (admin)
const createUser = async (req, res) => {
  try {
    const { name, email, phone, farmName, county, subCounty, trial } = req.body;

    if (!name || !farmName || !county) {
      return res.status(400).json({
        success: false,
        message: 'Name, farm name, and county are required.',
      });
    }

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: 'Either phone or email is required.',
      });
    }

    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email already exists.',
        });
      }
    }

    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'A user with this phone number already exists.',
        });
      }
    }

    const password = generatePassword();

    const user = await User.create({
      name,
      email: email ? email.toLowerCase() : undefined,
      phone: phone ? normalizePhone(phone) : undefined,
      password,
      role: 'farmAdmin',
      status: 'active',
      createdBy: req.admin.id,
    });

    const farm = await Farm.create({
      name: farmName,
      owner: user._id,
      location: {
        county,
        subCounty: subCounty || '',
      },
    });

    if (trial) {
      const trialDays = parseInt(trial) || 14;
      farm.trialStatus = 'trial';
      farm.trialStartsAt = new Date();
      farm.trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    } else {
      farm.trialStatus = 'active';
    }

    await farm.save();

    user.farmId = farm._id;
    await user.save();

    if (user.email) {
      await emailService.send({
        to: user.email,
        template: 'welcomeVerify',
        data: {
          name: user.name,
          email: user.email,
          farmName: farm.name,
          password,
          loginUrl: process.env.CLIENT_URL,
          trial: farm.trialStatus === 'trial' ? {
            days: Math.ceil((new Date(farm.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)),
            endsAt: farm.trialEndsAt,
          } : null,
        },
      });
    }

    logger.info('[Admin] Created farm admin', {
      userId: user._id,
      farmId: farm._id,
      trial: farm.trialStatus,
    });

    res.status(201).json({
      success: true,
      message: 'Farm admin created successfully.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
        farm: {
          id: farm._id,
          name: farm.name,
          trialStatus: farm.trialStatus,
          trialEndsAt: farm.trialEndsAt,
        },
        tempPassword: password,
      },
    });
  } catch (error) {
    logger.error('[Admin] Create user failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create user.',
    });
  }
};

// @desc    Update farm admin account
// @route   PUT /api/admin/users/:id
// @access  Private (admin)
const updateUser = async (req, res) => {
  try {
    const { name, email, phone, status } = req.body;

    const user = await User.findOne({
      _id: req.params.id,
      role: 'farmAdmin',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (phone) user.phone = normalizePhone(phone);
    if (status) user.status = status;
    user.updatedAt = new Date();

    await user.save();

    logger.info('[Admin] Updated user', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
      },
    });
  } catch (error) {
    logger.error('[Admin] Update user failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update user.',
    });
  }
};

// @desc    Reset farm admin password
// @route   POST /api/admin/users/:id/reset-password
// @access  Private (admin)
const resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: 'farmAdmin',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const newPassword = generatePassword();
    user.password = newPassword;
    await user.save();

    if (user.email) {
      await emailService.send({
        to: user.email,
        template: 'passwordReset',
        data: {
          name: user.name,
          password: newPassword,
          loginUrl: process.env.CLIENT_URL,
        },
      });
    }

    logger.info('[Admin] Reset password', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
      data: {
        tempPassword: newPassword,
      },
    });
  } catch (error) {
    logger.error('[Admin] Reset password failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to reset password.',
    });
  }
};

// @desc    Suspend farm admin account
// @route   POST /api/admin/users/:id/suspend
// @access  Private (admin)
const suspendUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: 'farmAdmin',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.status = 'suspended';
    user.updatedAt = new Date();
    await user.save();

    logger.info('[Admin] Suspended user', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'User suspended successfully.',
    });
  } catch (error) {
    logger.error('[Admin] Suspend user failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to suspend user.',
    });
  }
};

// @desc    Activate farm admin account
// @route   POST /api/admin/users/:id/activate
// @access  Private (admin)
const activateUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: 'farmAdmin',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.status = 'active';
    user.updatedAt = new Date();
    await user.save();

    logger.info('[Admin] Activated user', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'User activated successfully.',
    });
  } catch (error) {
    logger.error('[Admin] Activate user failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to activate user.',
    });
  }
};

// @desc    Delete farm admin and associated farm
// @route   DELETE /api/admin/users/:id
// @access  Private (admin)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: 'farmAdmin',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    await Farm.deleteMany({ owner: user._id });
    await User.deleteMany({ farmId: user.farmId });
    await user.deleteOne();

    logger.info('[Admin] Deleted user and farm', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'User and all associated data deleted.',
    });
  } catch (error) {
    logger.error('[Admin] Delete user failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete user.',
    });
  }
};

// @desc    Start trial for farm admin
// @route   POST /api/admin/users/:id/trial
// @access  Private (admin)
const startTrial = async (req, res) => {
  try {
    const { days = 14 } = req.body;

    const user = await User.findOne({
      _id: req.params.id,
      role: 'farmAdmin',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const farm = await Farm.findOne({ owner: user._id });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found.',
      });
    }

    farm.trialStatus = 'trial';
    farm.trialStartsAt = new Date();
    farm.trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    farm.updatedAt = new Date();
    await farm.save();

    logger.info('[Admin] Trial started', {
      userId: user._id,
      farmId: farm._id,
      days,
    });

    res.status(200).json({
      success: true,
      message: `Trial started for ${days} days.`,
      data: {
        trialStatus: farm.trialStatus,
        trialStartsAt: farm.trialStartsAt,
        trialEndsAt: farm.trialEndsAt,
        daysRemaining: days,
      },
    });
  } catch (error) {
    logger.error('[Admin] Start trial failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to start trial.',
    });
  }
};

// @desc    Extend trial for farm admin
// @route   POST /api/admin/users/:id/trial/extend
// @access  Private (admin)
const extendTrial = async (req, res) => {
  try {
    const { days = 7 } = req.body;

    const user = await User.findOne({
      _id: req.params.id,
      role: 'farmAdmin',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const farm = await Farm.findOne({ owner: user._id });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found.',
      });
    }

    if (farm.trialStatus === 'expired') {
      farm.trialStatus = 'trial';
      farm.trialStartsAt = new Date();
      farm.trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else {
      const currentEnd = farm.trialEndsAt ? new Date(farm.trialEndsAt) : new Date();
      farm.trialEndsAt = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);
      if (farm.trialStatus === 'none') {
        farm.trialStatus = 'trial';
        farm.trialStartsAt = new Date();
      }
    }

    farm.updatedAt = new Date();
    await farm.save();

    const daysRemaining = Math.ceil((new Date(farm.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));

    logger.info('[Admin] Trial extended', {
      userId: user._id,
      farmId: farm._id,
      days,
    });

    res.status(200).json({
      success: true,
      message: `Trial extended by ${days} days.`,
      data: {
        trialStatus: farm.trialStatus,
        trialStartsAt: farm.trialStartsAt,
        trialEndsAt: farm.trialEndsAt,
        daysRemaining: Math.max(0, daysRemaining),
      },
    });
  } catch (error) {
    logger.error('[Admin] Extend trial failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to extend trial.',
    });
  }
};

// @desc    Convert trial to full access
// @route   POST /api/admin/users/:id/convert
// @access  Private (admin)
const convertToFull = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: 'farmAdmin',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const farm = await Farm.findOne({ owner: user._id });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found.',
      });
    }

    farm.trialStatus = 'active';
    farm.trialStartsAt = null;
    farm.trialEndsAt = null;
    farm.updatedAt = new Date();
    await farm.save();

    logger.info('[Admin] Converted to full access', {
      userId: user._id,
      farmId: farm._id,
    });

    res.status(200).json({
      success: true,
      message: 'Converted to full access.',
      data: {
        trialStatus: farm.trialStatus,
      },
    });
  } catch (error) {
    logger.error('[Admin] Convert failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to convert.',
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  resetPassword,
  suspendUser,
  activateUser,
  deleteUser,
  startTrial,
  extendTrial,
  convertToFull,
};