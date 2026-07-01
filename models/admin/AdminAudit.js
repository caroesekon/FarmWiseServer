const mongoose = require('mongoose');

const adminAuditSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  adminEmail: {
    type: String,
  },
  action: {
    type: String,
    required: true,
  },
  method: {
    type: String,
  },
  endpoint: {
    type: String,
  },
  ip: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  statusCode: {
    type: Number,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

adminAuditSchema.index({ adminId: 1, timestamp: -1 });
adminAuditSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AdminAudit', adminAuditSchema);