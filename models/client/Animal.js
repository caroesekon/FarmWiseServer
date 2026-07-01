const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  tag: {
    type: String,
    required: true,
  },
  breed: {
    type: String,
    required: true,
  },
  sex: {
    type: String,
    enum: ['male', 'female'],
    required: true,
  },
  birthDate: {
    type: Date,
  },
  ageEstimate: {
    type: String,
  },
  source: {
    type: String,
    enum: ['born_on_farm', 'purchased', 'gifted', 'other'],
  },
  dam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
  },
  sire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
  },
  color: {
    type: String,
  },
  weight: {
    current: Number,
    unit: {
      type: String,
      default: 'kg',
    },
    lastUpdated: Date,
  },
  photo: {
    type: String,
  },
  category: {
    type: String,
    enum: ['dairyCattle', 'beefCattle', 'poultry', 'goats', 'sheep', 'pigs', 'other'],
    required: true,
  },
  batchId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'deceased', 'culled'],
    default: 'active',
  },
  group: {
    type: String,
  },
  pen: {
    type: String,
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

animalSchema.index({ farmId: 1, tag: 1 }, { unique: true });
animalSchema.index({ farmId: 1, status: 1 });
animalSchema.index({ farmId: 1, category: 1 });
animalSchema.index({ farmId: 1, batchId: 1 });

module.exports = mongoose.model('Animal', animalSchema);