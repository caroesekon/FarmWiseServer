const mongoose = require('mongoose');
const Finance = require('../../models/client/Finance');
const logger = require('../../utils/logger');

// @desc    Get finance records
// @route   GET /api/finance
// @access  Private (farmAdmin, manager)
const getFinances = async (req, res) => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 30 } = req.query;

    const query = { farmId: req.farmId };
    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const records = await Finance.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit));
    const total = await Finance.countDocuments(query);

    const totals = await Finance.aggregate([
      { $match: { farmId: new mongoose.Types.ObjectId(req.farmId) } },
      { $group: { _id: '$type', totalAmount: { $sum: '$amount' } } },
    ]);

    const incomeTotal = totals.find((t) => t._id === 'income')?.totalAmount || 0;
    const expenseTotal = totals.find((t) => t._id === 'expense')?.totalAmount || 0;

    res.status(200).json({
      success: true, count: records.length, total,
      totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page),
      summary: { totalIncome: incomeTotal, totalExpense: expenseTotal, balance: incomeTotal - expenseTotal },
      data: records,
    });
  } catch (error) {
    logger.error('[Client Finance] Get failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch finance records.' });
  }
};

// @desc    Add finance record
// @route   POST /api/finance
// @access  Private (farmAdmin, manager)
const addRecord = async (req, res) => {
  try {
    const { type, category, subCategory, amount, date, description, relatedTo } = req.body;

    if (!type || !category || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Type, category, and amount are required.' });
    }

    const record = await Finance.create({
      farmId: req.farmId, type, category, subCategory, amount,
      date: date || new Date(), description, relatedTo, recordedBy: req.user.id,
    });

    logger.info('[Client Finance] Record added', { recordId: record._id, farmId: req.farmId });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    logger.error('[Client Finance] Add record failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to add record.' });
  }
};

// @desc    Update finance record
// @route   PUT /api/finance/:id
// @access  Private (farmAdmin, manager)
const updateRecord = async (req, res) => {
  try {
    const record = await Finance.findOne({ _id: req.params.id, farmId: req.farmId });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    const { type, category, subCategory, amount, date, description } = req.body;

    if (type) record.type = type;
    if (category) record.category = category;
    if (subCategory) record.subCategory = subCategory;
    if (amount !== undefined) record.amount = amount;
    if (date) record.date = date;
    if (description !== undefined) record.description = description;
    record.updatedAt = new Date();

    await record.save();

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    logger.error('[Client Finance] Update failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update record.' });
  }
};

// @desc    Delete finance record
// @route   DELETE /api/finance/:id
// @access  Private (farmAdmin only)
const deleteRecord = async (req, res) => {
  try {
    const record = await Finance.findOneAndDelete({ _id: req.params.id, farmId: req.farmId });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    res.status(200).json({ success: true, message: 'Record deleted.' });
  } catch (error) {
    logger.error('[Client Finance] Delete failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to delete record.' });
  }
};

module.exports = { getFinances, addRecord, updateRecord, deleteRecord };