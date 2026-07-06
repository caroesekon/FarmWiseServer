const Vaccination = require('../../models/client/Vaccination');
const User = require('../../models/client/User');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

// @desc    Get all vaccinations
// @route   GET /api/vaccinations
// @access  Private (all client roles)
const getVaccinations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { farmId: req.farmId };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const vaccinations = await Vaccination.find(query)
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('vetId', 'name email phone');

    const total = await Vaccination.countDocuments(query);

    res.status(200).json({ success: true, count: vaccinations.length, total, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page), data: vaccinations });
  } catch (error) {
    logger.error('[Client Vaccination] Get failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch vaccinations.' });
  }
};

// @desc    Get vets for the farm
// @route   GET /api/vaccinations/vets
// @access  Private (all client roles)
const getVets = async (req, res) => {
  try {
    const vets = await User.find({ farmId: req.farmId, role: 'vet', status: 'active' }).select('name email phone');
    res.status(200).json({ success: true, data: vets });
  } catch (error) {
    logger.error('[Client Vaccination] Get vets failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch vets.' });
  }
};

// @desc    Schedule vaccination
// @route   POST /api/vaccinations
// @access  Private (farmAdmin, manager, vet)
const scheduleVaccination = async (req, res) => {
  try {
    const { vaccineName, batchNumber, animalIds, dueDate, vetId, notes } = req.body;

    if (!vaccineName || !animalIds || !dueDate) {
      return res.status(400).json({ success: false, message: 'Vaccine name, animal IDs, and due date are required.' });
    }

    let vetName = '';
    if (vetId) {
      const vet = await User.findById(vetId);
      vetName = vet?.name || '';
    }

    const vaccination = await Vaccination.create({
      farmId: req.farmId,
      vaccineName,
      batchNumber,
      animalIds,
      animalCount: animalIds.length,
      dueDate,
      vetId: vetId || undefined,
      vetName,
      recordedBy: req.user.id,
      notes,
    });

    if (vetId) {
      const vet = await User.findById(vetId);
      if (vet?.email) {
        await emailService.send({
          to: vet.email,
          template: 'reminderUpcoming',
          data: { farmName: req.farmId, reminders: [{ title: `Vaccination Scheduled: ${vaccineName}`, description: `${animalIds.length} animal(s) due on ${new Date(dueDate).toLocaleDateString('en-KE')}.`, dueDate }], count: 1 },
        });
      }
    }

    logger.info('[Client Vaccination] Scheduled', { vaccinationId: vaccination._id });
    res.status(201).json({ success: true, data: vaccination });
  } catch (error) {
    logger.error('[Client Vaccination] Schedule failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to schedule vaccination.' });
  }
};

// @desc    Update vaccination
// @route   PUT /api/vaccinations/:id
// @access  Private (farmAdmin, manager, vet)
const updateVaccination = async (req, res) => {
  try {
    const vaccination = await Vaccination.findOne({ _id: req.params.id, farmId: req.farmId });

    if (!vaccination) {
      return res.status(404).json({ success: false, message: 'Vaccination record not found.' });
    }

    const { vaccineName, batchNumber, animalIds, dueDate, vetId, notes } = req.body;

    if (vaccineName) vaccination.vaccineName = vaccineName;
    if (batchNumber) vaccination.batchNumber = batchNumber;
    if (animalIds) {
      vaccination.animalIds = animalIds;
      vaccination.animalCount = animalIds.length;
    }
    if (dueDate) vaccination.dueDate = dueDate;
    if (vetId !== undefined) {
      vaccination.vetId = vetId || undefined;
      vaccination.vetName = vetId ? (await User.findById(vetId))?.name || '' : '';
    }
    if (notes !== undefined) vaccination.notes = notes;
    vaccination.updatedAt = new Date();

    await vaccination.save();

    logger.info('[Client Vaccination] Updated', { vaccinationId: vaccination._id });
    res.status(200).json({ success: true, data: vaccination });
  } catch (error) {
    logger.error('[Client Vaccination] Update failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update vaccination.' });
  }
};

// @desc    Mark vaccination as completed
// @route   PUT /api/vaccinations/:id/complete
// @access  Private (farmAdmin, manager, vet)
const completeVaccination = async (req, res) => {
  try {
    const { administeredBy, notes } = req.body;

    const vaccination = await Vaccination.findOne({ _id: req.params.id, farmId: req.farmId });

    if (!vaccination) {
      return res.status(404).json({ success: false, message: 'Vaccination record not found.' });
    }

    vaccination.status = 'completed';
    vaccination.completedDate = new Date();
    vaccination.administeredBy = administeredBy || req.user.name;
    vaccination.notes = notes || vaccination.notes;
    vaccination.updatedAt = new Date();
    await vaccination.save();

    logger.info('[Client Vaccination] Completed', { vaccinationId: vaccination._id });
    res.status(200).json({ success: true, data: vaccination });
  } catch (error) {
    logger.error('[Client Vaccination] Complete failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to complete vaccination.' });
  }
};

// @desc    Delete vaccination
// @route   DELETE /api/vaccinations/:id
// @access  Private (farmAdmin only)
const deleteVaccination = async (req, res) => {
  try {
    const vaccination = await Vaccination.findOneAndDelete({ _id: req.params.id, farmId: req.farmId });

    if (!vaccination) {
      return res.status(404).json({ success: false, message: 'Vaccination record not found.' });
    }

    logger.info('[Client Vaccination] Deleted', { vaccinationId: vaccination._id });
    res.status(200).json({ success: true, message: 'Vaccination deleted.' });
  } catch (error) {
    logger.error('[Client Vaccination] Delete failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to delete vaccination.' });
  }
};

module.exports = { getVaccinations, getVets, scheduleVaccination, updateVaccination, completeVaccination, deleteVaccination };