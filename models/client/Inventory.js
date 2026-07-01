const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
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
    enum: ['feed', 'medicine', 'vaccine', 'supplement', 'equipment', 'other'],
    required: true,
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  reorderAt: {
    type: Number,
  },
  dailyConsumption: {
    type: Number,
    default: 0,
  },
  costPerUnit: {
    type: Number,
  },
  supplier: {
    name: String,
    contact: String,
  },
  expiryDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'depleted', 'discontinued'],
    default: 'active',
  },
  lastRestocked: {
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

inventorySchema.index({ farmId: 1, category: 1 });
inventorySchema.index({ farmId: 1, status: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);