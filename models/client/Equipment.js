const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['tractor', 'plough', 'irrigation', 'milking', 'feeding', 'transport', 'other'],
    required: true,
  },
  make: {
    type: String,
  },
  model: {
    type: String,
  },
  year: {
    type: Number,
  },
  serialNumber: {
    type: String,
  },
  purchaseDate: {
    type: Date,
  },
  purchaseCost: {
    type: Number,
  },
  usageHours: {
    type: Number,
    default: 0,
  },
  serviceIntervalHours: {
    type: Number,
  },
  lastMaintenanceDate: {
    type: Date,
  },
  lastMaintenanceHours: {
    type: Number,
  },
  nextMaintenanceDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'in_repair', 'retired'],
    default: 'active',
  },
  notes: {
    type: String,
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

equipmentSchema.index({ farmId: 1, status: 1 });
equipmentSchema.index({ nextMaintenanceDate: 1 });

module.exports = mongoose.model('Equipment', equipmentSchema);