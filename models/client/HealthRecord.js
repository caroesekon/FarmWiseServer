const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
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
    enum: [
      'diagnosis',
      'treatment',
      'vet_visit',
      'deworming',
      'hoof_trimming',
      'injury',
      'surgery',
      'other',
    ],
    required: true,
  },
  diagnosis: {
    type: String,
  },
  symptoms: [
    {
      type: String,
    },
  ],
  treatment: {
    type: String,
  },
  medication: [
    {
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      withdrawalPeriod: Number,
    },
  ],
  vetName: {
    type: String,
  },
  vetContact: {
    type: String,
  },
  cost: {
    type: Number,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  followUpDate: {
    type: Date,
  },
  severity: {
    type: String,
    enum: ['mild', 'moderate', 'severe', 'critical'],
    default: 'moderate',
  },
  outcome: {
    type: String,
    enum: ['recovering', 'recovered', 'ongoing', 'deceased'],
    default: 'ongoing',
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
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

healthRecordSchema.index({ farmId: 1, animalId: 1, date: -1 });
healthRecordSchema.index({ farmId: 1, type: 1 });
healthRecordSchema.index({ followUpDate: 1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);