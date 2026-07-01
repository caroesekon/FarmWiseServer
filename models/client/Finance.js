const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  subCategory: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  description: {
    type: String,
  },
  relatedTo: {
    module: {
      type: String,
      enum: ['animal', 'crop', 'equipment', 'inventory', 'other'],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

financeSchema.index({ farmId: 1, date: -1 });
financeSchema.index({ farmId: 1, type: 1, date: -1 });
financeSchema.index({ farmId: 1, category: 1 });

module.exports = mongoose.model('Finance', financeSchema);