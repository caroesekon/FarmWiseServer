const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  fieldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Field',
    required: true,
  },
  cropType: {
    type: String,
    required: true,
  },
  variety: {
    type: String,
  },
  plantingDate: {
    type: Date,
    required: true,
  },
  expectedHarvestDate: {
    type: Date,
  },
  actualHarvestDate: {
    type: Date,
  },
  yield: {
    quantity: Number,
    unit: String,
  },
  inputs: [
    {
      type: {
        type: String,
        enum: ['fertilizer', 'pesticide', 'herbicide', 'other'],
      },
      name: String,
      quantity: Number,
      unit: String,
      cost: Number,
      date: Date,
    },
  ],
  irrigation: [
    {
      date: Date,
      method: String,
      duration: Number,
    },
  ],
  status: {
    type: String,
    enum: ['growing', 'harvested', 'failed'],
    default: 'growing',
  },
  notes: {
    type: String,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

cropSchema.index({ farmId: 1, fieldId: 1 });
cropSchema.index({ farmId: 1, status: 1 });
cropSchema.index({ expectedHarvestDate: 1 });

module.exports = mongoose.model('Crop', cropSchema);