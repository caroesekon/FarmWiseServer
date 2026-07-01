const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  location: {
    county: {
      type: String,
      required: true,
    },
    subCounty: {
      type: String,
    },
    ward: {
      type: String,
    },
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
  },
  size: {
    type: Number,
  },
  sizeUnit: {
    type: String,
    enum: ['acres', 'hectares'],
    default: 'acres',
  },
  livestock: [
    {
      type: {
        type: String,
        enum: ['dairyCattle', 'beefCattle', 'poultry', 'goats', 'sheep', 'pigs', 'other'],
      },
      count: Number,
    },
  ],
  crops: [
    {
      type: String,
    },
  ],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
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

farmSchema.index({ owner: 1 });
farmSchema.index({ status: 1 });

module.exports = mongoose.model('Farm', farmSchema);