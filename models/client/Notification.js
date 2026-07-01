const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['email', 'sms'],
    required: true,
  },
  templateKey: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
  },
  content: {
    type: String,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed', 'bounced'],
    default: 'sent',
  },
  providerMessageId: {
    type: String,
  },
  errorMessage: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.index({ farmId: 1, userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);