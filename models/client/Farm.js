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
    county: { type: String, required: true },
    subCounty: { type: String },
    ward: { type: String },
    lat: { type: Number },
    lng: { type: Number },
  },
  size: { type: Number },
  sizeUnit: { type: String, enum: ['acres', 'hectares'], default: 'acres' },
  livestock: [{
    type: { type: String, enum: ['dairyCattle', 'beefCattle', 'poultry', 'goats', 'sheep', 'pigs', 'other'] },
    count: Number,
  }],
  crops: [{ type: String }],
  productPrices: [{
    name: { type: String, required: true },
    category: { type: String, enum: ['animal', 'crop', 'other'], default: 'animal' },
    price: { type: Number, required: true },
    unit: { type: String, required: true },
  }],
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  trialStatus: { type: String, enum: ['none', 'trial', 'active', 'expired'], default: 'none' },
  trialStartsAt: { type: Date },
  trialEndsAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

farmSchema.index({ owner: 1 });
farmSchema.index({ status: 1 });
farmSchema.index({ trialStatus: 1 });

module.exports = mongoose.model('Farm', farmSchema);