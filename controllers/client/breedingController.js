const Breeding = require('../../models/client/Breeding');
const logger = require('../../utils/logger');

// @desc    Get breeding records
// @route   GET /api/breeding
// @access  Private (all client roles)
const getBreedingRecords = async (req, res) => {
  try {
    const { animalId, eventType, status, page = 1, limit = 20 } = req.query;

    const query = { farmId: req.farmId };
    if (animalId) query.animalId = animalId;
    if (eventType) query.eventType = eventType;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const records = await Breeding.find(query)
      .sort({ eventDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('animalId', 'tag breed');

    const total = await Breeding.countDocuments(query);

    res.status(200).json({
      success: true, count: records.length, total,
      totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page), data: records,
    });
  } catch (error) {
    logger.error('[Client Breeding] Get failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch breeding records.' });
  }
};

// @desc    Add breeding event
// @route   POST /api/breeding
// @access  Private (farmAdmin, manager, vet)
const addBreedingEvent = async (req, res) => {
  try {
    const { animalId, eventType, eventDate, expectedDate, inseminationType, bullId, bullName, semenBatch, pregnancyStatus, calfCount, notes } = req.body;

    if (!animalId || !eventType) {
      return res.status(400).json({ success: false, message: 'Animal ID and event type are required.' });
    }

    const record = await Breeding.create({
      farmId: req.farmId, animalId, eventType,
      eventDate: eventDate || new Date(),
      expectedDate: expectedDate || undefined,
      inseminationType: inseminationType || undefined,
      bullId: bullId || undefined, bullName: bullName || undefined,
      semenBatch: semenBatch || undefined,
      pregnancyStatus: pregnancyStatus || undefined,
      calfCount: calfCount || undefined,
      recordedBy: req.user.id, notes: notes || undefined,
    });

    logger.info('[Client Breeding] Event added', { recordId: record._id, farmId: req.farmId, eventType });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    logger.error('[Client Breeding] Add event failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to add breeding event.' });
  }
};

// @desc    Update breeding event
// @route   PUT /api/breeding/:id
// @access  Private (farmAdmin, manager, vet)
const updateBreedingEvent = async (req, res) => {
  try {
    const record = await Breeding.findOne({ _id: req.params.id, farmId: req.farmId });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Breeding record not found.' });
    }

    const { eventType, eventDate, expectedDate, inseminationType, bullId, bullName, semenBatch, pregnancyStatus, calfCount, calfIds, status, notes } = req.body;

    if (eventType) record.eventType = eventType;
    if (eventDate) record.eventDate = eventDate;
    if (expectedDate) record.expectedDate = expectedDate;
    if (inseminationType) record.inseminationType = inseminationType;
    if (bullId) record.bullId = bullId;
    if (bullName) record.bullName = bullName;
    if (semenBatch) record.semenBatch = semenBatch;
    if (pregnancyStatus) record.pregnancyStatus = pregnancyStatus;
    if (calfCount !== undefined) record.calfCount = calfCount;
    if (calfIds) record.calfIds = calfIds;
    if (status) record.status = status;
    if (notes !== undefined) record.notes = notes;
    record.updatedAt = new Date();

    await record.save();

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    logger.error('[Client Breeding] Update failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update breeding record.' });
  }
};

// @desc    Delete breeding event
// @route   DELETE /api/breeding/:id
// @access  Private (farmAdmin only)
const deleteBreedingEvent = async (req, res) => {
  try {
    const record = await Breeding.findOneAndDelete({ _id: req.params.id, farmId: req.farmId });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Breeding record not found.' });
    }

    logger.info('[Client Breeding] Deleted', { recordId: record._id });
    res.status(200).json({ success: true, message: 'Breeding event deleted.' });
  } catch (error) {
    logger.error('[Client Breeding] Delete failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to delete breeding event.' });
  }
};

module.exports = { getBreedingRecords, addBreedingEvent, updateBreedingEvent, deleteBreedingEvent };