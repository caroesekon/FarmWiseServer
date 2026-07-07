const SystemConfig = require('../../models/admin/SystemConfig');
const Farm = require('../../models/client/Farm');
const User = require('../../models/client/User');
const Animal = require('../../models/client/Animal');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// @desc    Get system metrics
// @route   GET /api/admin/system/metrics
// @access  Private (admin)
const getMetrics = async (req, res) => {
  try {
    const totalFarmAdmins = await User.countDocuments({ role: 'farmAdmin' });
    const activeFarmAdmins = await User.countDocuments({ role: 'farmAdmin', status: 'active' });
    const totalFarms = await Farm.countDocuments({ status: 'active' });
    const totalAnimals = await Animal.countDocuments({ status: 'active' });
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.status(200).json({
      success: true,
      data: {
        users: { total: totalFarmAdmins, active: activeFarmAdmins, inactive: totalFarmAdmins - activeFarmAdmins },
        farms: totalFarms,
        animals: totalAnimals,
        system: { dbStatus, uptime: process.uptime(), memoryUsage: process.memoryUsage() },
      },
    });
  } catch (error) {
    logger.error('[Admin] Get metrics failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch metrics.' });
  }
};

// @desc    Get system configuration
// @route   GET /api/admin/system/config
// @access  Private (admin)
const getConfig = async (req, res) => {
  try {
    const configs = await SystemConfig.find();
    const configMap = {};
    for (const config of configs) {
      configMap[config.key] = config.value;
    }
    res.status(200).json({ success: true, data: configMap });
  } catch (error) {
    logger.error('[Admin] Get config failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch configuration.' });
  }
};

// @desc    Update system configuration
// @route   PUT /api/admin/system/config
// @access  Private (admin)
const updateConfig = async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await SystemConfig.findOneAndUpdate(
        { key },
        { value, updatedBy: req.admin.email, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }
    logger.info('[Admin] Updated system config', { keys: Object.keys(updates) });
    res.status(200).json({ success: true, message: 'Configuration updated successfully.' });
  } catch (error) {
    logger.error('[Admin] Update config failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update configuration.' });
  }
};

// @desc    Toggle maintenance mode
// @route   POST /api/admin/system/maintenance
// @access  Private (admin)
const toggleMaintenance = async (req, res) => {
  try {
    const { enabled, message, allowedIPs } = req.body;
    await SystemConfig.findOneAndUpdate(
      { key: 'maintenanceMode' },
      { value: { enabled: enabled || false, message: message || 'We are making FarmWise better. Back shortly.', allowedIPs: allowedIPs || [] }, updatedBy: req.admin.email, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    logger.info('[Admin] Maintenance mode updated', { enabled });
    res.status(200).json({ success: true, message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}.` });
  } catch (error) {
    logger.error('[Admin] Toggle maintenance failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to toggle maintenance mode.' });
  }
};

// @desc    Get downloads configuration
// @route   GET /api/admin/system/downloads
// @access  Private (admin)
const getDownloads = async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ key: 'downloads' });
    res.status(200).json({
      success: true,
      data: config?.value || {
        windows: { enabled: false, url: '', version: '' },
        android: { enabled: false, url: '', version: '' },
      },
    });
  } catch (error) {
    logger.error('[Admin] Get downloads failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch downloads.' });
  }
};

// @desc    Update downloads configuration
// @route   PUT /api/admin/system/downloads
// @access  Private (admin)
const updateDownloads = async (req, res) => {
  try {
    const { windows, android } = req.body;
    await SystemConfig.findOneAndUpdate(
      { key: 'downloads' },
      { value: { windows, android }, updatedBy: req.admin.email, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    logger.info('[Admin] Downloads config updated');
    res.status(200).json({ success: true, message: 'Downloads configuration updated.' });
  } catch (error) {
    logger.error('[Admin] Update downloads failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update downloads.' });
  }
};

module.exports = { getMetrics, getConfig, updateConfig, toggleMaintenance, getDownloads, updateDownloads };