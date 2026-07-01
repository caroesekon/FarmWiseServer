const backupService = require('../../services/backupService');
const SystemConfig = require('../../models/admin/SystemConfig');
const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

// @desc    Create backup now
// @route   POST /api/admin/backups/create
// @access  Private (admin)
const createBackup = async (req, res) => {
  try {
    const { type = 'full' } = req.body;
    const backup = await backupService.createBackup(type);

    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      data: backup,
    });
  } catch (error) {
    logger.error('[Admin Backup] Create failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
    });
  }
};

// @desc    List all backups
// @route   GET /api/admin/backups
// @access  Private (admin)
const listBackups = async (req, res) => {
  try {
    const files = backupService.listBackups();

    res.status(200).json({
      success: true,
      count: files.length,
      data: files,
    });
  } catch (error) {
    logger.error('[Admin Backup] List failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
    });
  }
};

// @desc    Download backup file
// @route   GET /api/admin/backups/:filename
// @access  Private (admin)
const downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '..', '..', 'backups', filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found',
      });
    }

    res.download(filepath);
  } catch (error) {
    logger.error('[Admin Backup] Download failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to download backup',
    });
  }
};

// @desc    Send backup to email
// @route   POST /api/admin/backups/:filename/email
// @access  Private (admin)
const emailBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    await backupService.sendBackupEmail(filename, email);

    res.status(200).json({
      success: true,
      message: `Backup sent to ${email}`,
    });
  } catch (error) {
    logger.error('[Admin Backup] Email failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to send backup',
    });
  }
};

// @desc    Delete backup
// @route   DELETE /api/admin/backups/:filename
// @access  Private (admin)
const deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const deleted = backupService.deleteBackup(filename);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Backup deleted',
    });
  } catch (error) {
    logger.error('[Admin Backup] Delete failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
    });
  }
};

// @desc    Restore from backup
// @route   POST /api/admin/backups/:filename/restore
// @access  Private (admin)
const restoreBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const stats = await backupService.restoreBackup(filename);

    res.status(200).json({
      success: true,
      message: 'Backup restored successfully',
      data: { stats },
    });
  } catch (error) {
    logger.error('[Admin Backup] Restore failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
    });
  }
};

// @desc    Upload and restore backup
// @route   POST /api/admin/backups/upload
// @access  Private (admin)
const uploadBackup = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const stats = await backupService.restoreFromUpload(req.file.buffer);

    res.status(200).json({
      success: true,
      message: 'Backup uploaded and restored successfully',
      data: { stats },
    });
  } catch (error) {
    logger.error('[Admin Backup] Upload failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore backup',
    });
  }
};

// @desc    Get backup config
// @route   GET /api/admin/backups/config
// @access  Private (admin)
const getConfig = async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ key: 'backupConfig' });

    res.status(200).json({
      success: true,
      data: config?.value || {
        frequency: 'none',
        maxFiles: 30,
        autoEmail: false,
        email: '',
      },
    });
  } catch (error) {
    logger.error('[Admin Backup] Get config failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch config',
    });
  }
};

// @desc    Update backup config
// @route   PUT /api/admin/backups/config
// @access  Private (admin)
const updateConfig = async (req, res) => {
  try {
    const { frequency, maxFiles, autoEmail, email } = req.body;

    const config = await SystemConfig.findOneAndUpdate(
      { key: 'backupConfig' },
      {
        value: {
          frequency: frequency || 'none',
          maxFiles: maxFiles || 30,
          autoEmail: autoEmail || false,
          email: email || '',
        },
        updatedBy: req.admin.email,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    logger.info('[Admin Backup] Config updated', { frequency });

    res.status(200).json({
      success: true,
      message: 'Backup config updated',
      data: config.value,
    });
  } catch (error) {
    logger.error('[Admin Backup] Update config failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update config',
    });
  }
};

module.exports = {
  createBackup,
  listBackups,
  downloadBackup,
  emailBackup,
  deleteBackup,
  restoreBackup,
  uploadBackup,
  getConfig,
  updateConfig,
};