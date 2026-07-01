const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'health',
      'vaccination',
      'breeding',
      'production_drop',
      'inventory',
      'equipment',
      'weather',
      'task',
      'system',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    enum: ['info', 'medium', 'high', 'critical'],
    required: true,
  },
  dueDate: {
    type: Date,
  },
  animalIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },
  ],
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  referenceModel: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
    default: 'active',
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  acknowledgedAt: {
    type: Date,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

alertSchema.index({ farmId: 1, status: 1, level: -1 });
alertSchema.index({ farmId: 1, type: 1, status: 1 });
alertSchema.index({ status: 1, level: -1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);