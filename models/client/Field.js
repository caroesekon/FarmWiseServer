const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
  },
  sizeUnit: {
    type: String,
    enum: ['acres', 'hectares'],
    default: 'acres',
  },
  soilType: {
    type: String,
  },
  currentCrop: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'fallow', 'resting', 'harvested'],
    default: 'active',
  },
  restStartDate: {
    type: Date,
  },
  restEndDate: {
    type: Date,
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

fieldSchema.index({ farmId: 1, status: 1 });

module.exports = mongoose.model('Field', fieldSchema);