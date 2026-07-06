const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true,
  },
  type: {
    type: String,
    enum: ['milk', 'eggs', 'weight', 'wool', 'other'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  session: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'single'],
    default: 'single',
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  value: {
    type: Number,
    default: 0,
  },
});

productionSchema.index({ farmId: 1, date: -1 });
productionSchema.index({ farmId: 1, animalId: 1, date: -1 });
productionSchema.index({ farmId: 1, type: 1, date: -1 });

module.exports = mongoose.model('Production', productionSchema);