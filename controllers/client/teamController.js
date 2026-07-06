const User = require('../../models/client/User');
const Farm = require('../../models/client/Farm');
const generatePassword = require('../../utils/generatePassword');
const { normalizePhone } = require('../../utils/validators');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

// @desc    Get all team members for farm
// @route   GET /api/team
// @access  Private (farmAdmin, manager)
const getTeam = async (req, res) => {
  try {
    const team = await User.find({ farmId: req.farmId }).select('-password').sort({ role: 1, name: 1 });
    res.status(200).json({ success: true, count: team.length, data: team });
  } catch (error) {
    logger.error('[Client Team] Get team failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch team members.' });
  }
};

// @desc    Add team member
// @route   POST /api/team
// @access  Private (farmAdmin only)
const addMember = async (req, res) => {
  try {
    const { name, phone, email, role } = req.body;

    if (!name || !phone || !role) {
      return res.status(400).json({ success: false, message: 'Name, phone, and role are required.' });
    }

    const validRoles = ['manager', 'worker', 'vet'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const normalizedPhone = normalizePhone(phone);

    const existing = await User.findOne({ phone: normalizedPhone, farmId: req.farmId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A team member with this phone number already exists.' });
    }

    const password = generatePassword();

    const user = await User.create({
      name, phone: normalizedPhone, email: email || undefined, password,
      role, farmId: req.farmId, status: 'active', createdBy: req.user.id,
    });

    const farm = await Farm.findById(req.farmId).select('name');

    if (user.email) {
      await emailService.send({
        to: user.email,
        template: 'welcomeVerify',
        data: {
          name: user.name,
          email: user.email,
          farmName: farm?.name || 'Your Farm',
          password,
          loginUrl: process.env.CLIENT_URL,
        },
      });
    }

    logger.info('[Client Team] Added member', { userId: user._id, farmId: req.farmId, role });

    res.status(201).json({
      success: true,
      message: 'Team member added successfully.',
      data: {
        user: { id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role },
        credentials: { phone: user.phone, password, email: user.email },
        emailSent: !!user.email,
      },
    });
  } catch (error) {
    logger.error('[Client Team] Add member failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to add team member.' });
  }
};

// @desc    Remove team member
// @route   DELETE /api/team/:id
// @access  Private (farmAdmin only)
const removeMember = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, farmId: req.farmId });
    if (!user) return res.status(404).json({ success: false, message: 'Team member not found.' });
    if (user.role === 'farmAdmin') return res.status(400).json({ success: false, message: 'Cannot remove the farm admin.' });

    await user.deleteOne();
    logger.info('[Client Team] Removed member', { userId: user._id, farmId: req.farmId });
    res.status(200).json({ success: true, message: 'Team member removed.' });
  } catch (error) {
    logger.error('[Client Team] Remove member failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to remove team member.' });
  }
};

module.exports = { getTeam, addMember, removeMember };