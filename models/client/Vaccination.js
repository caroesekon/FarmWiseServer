const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  vaccineName: {
    type: String,
    required: true,
  },
  batchNumber: {
    type: String,
  },
  animalIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },
  ],
  animalCount: {
    type: Number,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  completedDate: {
    type: Date,
  },
  administeredBy: {
    type: String,
  },
  vetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  vetName: {
    type: String,
  },
  cost: {
    type: Number,
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'overdue', 'skipped'],
    default: 'pending',
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

vaccinationSchema.index({ farmId: 1, dueDate: 1 });
vaccinationSchema.index({ farmId: 1, status: 1 });
vaccinationSchema.index({ dueDate: 1, status: 1 });
vaccinationSchema.index({ vetId: 1, dueDate: 1 });

module.exports = mongoose.model('Vaccination', vaccinationSchema);