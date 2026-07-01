const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/client/User');
const Farm = require('../models/client/Farm');
const Animal = require('../models/client/Animal');
const HealthRecord = require('../models/client/HealthRecord');
const Vaccination = require('../models/client/Vaccination');
const Production = require('../models/client/Production');
const Breeding = require('../models/client/Breeding');
const Field = require('../models/client/Field');
const Crop = require('../models/client/Crop');
const Inventory = require('../models/client/Inventory');
const Equipment = require('../models/client/Equipment');
const Finance = require('../models/client/Finance');
const Task = require('../models/client/Task');
const Alert = require('../models/client/Alert');
const Notification = require('../models/client/Notification');
const AdminAccess = require('../models/admin/AdminAccess');
const SystemConfig = require('../models/admin/SystemConfig');
const emailService = require('./emailService');
const logger = require('../utils/logger');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const collections = {
  users: User,
  farms: Farm,
  animals: Animal,
  healthRecords: HealthRecord,
  vaccinations: Vaccination,
  production: Production,
  breeding: Breeding,
  fields: Field,
  crops: Crop,
  inventory: Inventory,
  equipment: Equipment,
  finance: Finance,
  tasks: Task,
  alerts: Alert,
  notifications: Notification,
  adminAccess: AdminAccess,
  systemConfig: SystemConfig,
};

const createBackup = async (type = 'full') => {
  try {
    const timestamp = new Date();
    const filename = `farmwise-backup-${timestamp.toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    const data = {};
    const stats = {};

    for (const [name, Model] of Object.entries(collections)) {
      const records = await Model.find({}).lean();
      data[name] = records;
      stats[`total${name.charAt(0).toUpperCase() + name.slice(1)}`] = records.length;
    }

    const backup = {
      appName: process.env.APP_NAME || 'FarmWise',
      version: process.env.API_VERSION || 'v1',
      backupType: type,
      timestamp: timestamp.toISOString(),
      data,
      stats,
    };

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    logger.info('[Backup] Created', { filename, size: fs.statSync(filepath).size });

    return { filename, filepath, stats, timestamp };
  } catch (error) {
    logger.error('[Backup] Creation failed', { error: error.message });
    throw error;
  }
};

const listBackups = () => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('farmwise-backup-') && f.endsWith('.json'))
      .map((f) => {
        const filepath = path.join(BACKUP_DIR, f);
        const stat = fs.statSync(filepath);
        return {
          filename: f,
          size: stat.size,
          sizeFormatted: formatSize(stat.size),
          createdAt: stat.birthtime,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return files;
  } catch (error) {
    logger.error('[Backup] List failed', { error: error.message });
    return [];
  }
};

const getBackup = (filename) => {
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
};

const deleteBackup = (filename) => {
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return false;
  fs.unlinkSync(filepath);
  logger.info('[Backup] Deleted', { filename });
  return true;
};

const restoreBackup = async (filename) => {
  const backup = getBackup(filename);
  if (!backup) throw new Error('Backup file not found');

  logger.info('[Backup] Starting restore', { filename });

  for (const [name, Model] of Object.entries(collections)) {
    if (backup.data[name]) {
      await Model.deleteMany({});
      if (backup.data[name].length > 0) {
        await Model.insertMany(backup.data[name]);
      }
      logger.info(`[Backup] Restored ${name}: ${backup.data[name].length} records`);
    }
  }

  logger.info('[Backup] Restore complete');
  return backup.stats;
};

const restoreFromUpload = async (fileBuffer) => {
  try {
    const backup = JSON.parse(fileBuffer.toString('utf-8'));

    if (!backup.data || !backup.stats) {
      throw new Error('Invalid backup file format');
    }

    logger.info('[Backup] Starting restore from upload');

    for (const [name, Model] of Object.entries(collections)) {
      if (backup.data[name]) {
        await Model.deleteMany({});
        if (backup.data[name].length > 0) {
          await Model.insertMany(backup.data[name]);
        }
        logger.info(`[Backup] Restored ${name}: ${backup.data[name].length} records`);
      }
    }

    logger.info('[Backup] Restore from upload complete');
    return backup.stats;
  } catch (error) {
    logger.error('[Backup] Restore from upload failed', { error: error.message });
    throw error;
  }
};

const sendBackupEmail = async (filename, email) => {
  const backup = getBackup(filename);
  if (!backup) throw new Error('Backup file not found');

  const jsonString = JSON.stringify(backup, null, 2);
  const base64 = Buffer.from(jsonString).toString('base64');

  await emailService.send({
    to: email,
    subject: `FarmWise Backup — ${filename}`,
    htmlBody: `
      <h2>FarmWise Backup</h2>
      <p><strong>File:</strong> ${filename}</p>
      <p><strong>Date:</strong> ${backup.timestamp}</p>
      <p><strong>Stats:</strong></p>
      <ul>
        ${Object.entries(backup.stats).map(([k, v]) => `<li>${k}: ${v}</li>`).join('')}
      </ul>
      <p>Backup data is attached as base64 below (copy and save as .json):</p>
      <textarea style="width:100%;height:200px;font-size:11px;">${base64}</textarea>
    `,
    textBody: `FarmWise Backup: ${filename}\nDate: ${backup.timestamp}\n\nBase64 data:\n${base64}`,
  });

  logger.info('[Backup] Emailed', { filename, email });
};

const cleanupOldBackups = async (maxFiles = 30) => {
  const files = listBackups();
  if (files.length > maxFiles) {
    const toDelete = files.slice(maxFiles);
    for (const file of toDelete) {
      deleteBackup(file.filename);
    }
    logger.info(`[Backup] Cleaned up ${toDelete.length} old backups`);
  }
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

module.exports = {
  createBackup,
  listBackups,
  getBackup,
  deleteBackup,
  restoreBackup,
  restoreFromUpload,
  sendBackupEmail,
  cleanupOldBackups,
};