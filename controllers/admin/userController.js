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
        const farm = await Farm.findOne({ owner: user._id }).select('name location');
        return {
          ...user.toObject(),
          farmName: farm?.name || 'No farm',
          farmLocation: farm?.location || null,
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

    const farm = await Farm.findOne({ owner: user._id }).select('name location size sizeUnit livestock crops status');

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
    const { name, email, phone, farmName, county, subCounty } = req.body;

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

    user.farmId = farm._id;
    await user.save();

    let emailResult = { sent: false, error: null };

    if (user.email) {
      emailResult = await emailService.send({
        to: user.email,
        template: 'welcomeVerify',
        data: {
          name: user.name,
          email: user.email,
          farmName: farm.name,
          password,
          loginUrl: process.env.CLIENT_URL,
        },
      });

      if (!emailResult.success) {
        logger.error('[Admin] Welcome email failed', {
          userId: user._id,
          email: user.email,
          error: emailResult.error,
        });
      }
    }

    logger.info('[Admin] Created farm admin', {
      userId: user._id,
      farmId: farm._id,
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
        },
        tempPassword: password,
        email: {
          sent: emailResult.success,
          error: emailResult.error || null,
          messageId: emailResult.messageId || null,
        },
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

    let emailResult = { sent: false, error: null };

    if (user.email) {
      emailResult = await emailService.send({
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
        email: {
          sent: emailResult.success,
          error: emailResult.error || null,
          messageId: emailResult.messageId || null,
        },
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

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  resetPassword,
  suspendUser,
  activateUser,
  deleteUser,
};