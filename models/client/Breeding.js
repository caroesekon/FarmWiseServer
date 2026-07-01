const mongoose = require('mongoose');

const breedingSchema = new mongoose.Schema({
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
  eventType: {
    type: String,
    enum: [
      'heat_observed',
      'expectedHeat',
      'insemination',
      'pregnancyCheck',
      'pregnancyConfirmed',
      'expectedCalving',
      'calving',
      'abortion',
      'other',
    ],
    required: true,
  },
  eventDate: {
    type: Date,
  },
  expectedDate: {
    type: Date,
  },
  inseminationType: {
    type: String,
    enum: ['artificial', 'natural'],
  },
  bullId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
  },
  bullName: {
    type: String,
  },
  semenBatch: {
    type: String,
  },
  pregnancyStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'negative', 'unknown'],
  },
  calfCount: {
    type: Number,
  },
  calfIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },
  ],
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'missed'],
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

breedingSchema.index({ farmId: 1, animalId: 1, eventDate: -1 });
breedingSchema.index({ farmId: 1, expectedDate: 1 });
breedingSchema.index({ farmId: 1, eventType: 1, status: 1 });

module.exports = mongoose.model('Breeding', breedingSchema);