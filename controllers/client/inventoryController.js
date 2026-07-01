const Inventory = require('../../models/client/Inventory');
const Alert = require('../../models/client/Alert');
const logger = require('../../utils/logger');

// @desc    Get inventory items
// @route   GET /api/client/inventory
// @access  Private (all client roles)
const getInventory = async (req, res) => {
  try {
    const { category, status, page = 1, limit = 20 } = req.query;

    const query = { farmId: req.farmId };

    if (category) query.category = category;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const items = await Inventory.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Inventory.countDocuments(query);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: items,
    });
  } catch (error) {
    logger.error('[Client Inventory] Get failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory.',
    });
  }
};

// @desc    Add inventory item
// @route   POST /api/client/inventory
// @access  Private (farmAdmin, manager)
const addItem = async (req, res) => {
  try {
    const {
      name,
      category,
      currentStock,
      unit,
      reorderAt,
      dailyConsumption,
      costPerUnit,
      supplier,
      expiryDate,
    } = req.body;

    if (!name || !category || currentStock === undefined || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, current stock, and unit are required.',
      });
    }

    const existing = await Inventory.findOne({
      farmId: req.farmId,
      name,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An item with this name already exists.',
      });
    }

    const item = await Inventory.create({
      farmId: req.farmId,
      name,
      category,
      currentStock,
      unit,
      reorderAt,
      dailyConsumption,
      costPerUnit,
      supplier,
      expiryDate,
      lastRestocked: new Date(),
    });

    if (item.currentStock <= (item.reorderAt || 0)) {
      await Alert.create({
        farmId: req.farmId,
        type: 'inventory',
        title: item.currentStock <= 0 ? 'Stock Depleted' : 'Stock Running Low',
        description: item.currentStock <= 0
          ? `${item.name} is out of stock. Reorder immediately.`
          : `${item.name} is low — ${item.currentStock} ${item.unit} remaining. Reorder at ${item.reorderAt} ${item.unit}.`,
        level: item.currentStock <= 0 ? 'critical' : 'high',
        referenceId: item._id,
        referenceModel: 'Inventory',
        status: 'active',
      });
    }

    logger.info('[Client Inventory] Item added', { itemId: item._id, farmId: req.farmId });

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    logger.error('[Client Inventory] Add item failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to add inventory item.',
    });
  }
};

// @desc    Update stock
// @route   PUT /api/client/inventory/:id/stock
// @access  Private (farmAdmin, manager, worker)
const updateStock = async (req, res) => {
  try {
    const { quantity, operation } = req.body;

    if (quantity === undefined || !operation) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and operation (add/remove/set) are required.',
      });
    }

    const item = await Inventory.findOne({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found.',
      });
    }

    if (operation === 'add') {
      item.currentStock += quantity;
    } else if (operation === 'remove') {
      item.currentStock = Math.max(0, item.currentStock - quantity);
    } else if (operation === 'set') {
      item.currentStock = quantity;
    }

    item.lastRestocked = new Date();
    item.updatedAt = new Date();
    item.status = item.currentStock <= 0 ? 'depleted' : 'active';

    await item.save();

    if (item.currentStock <= (item.reorderAt || 0) && item.currentStock > 0) {
      const existingAlert = await Alert.findOne({
        farmId: req.farmId,
        type: 'inventory',
        referenceId: item._id,
        status: 'active',
      });

      if (!existingAlert) {
        await Alert.create({
          farmId: req.farmId,
          type: 'inventory',
          title: 'Stock Running Low',
          description: `${item.name} is low — ${item.currentStock} ${item.unit} remaining. Reorder at ${item.reorderAt} ${item.unit}.`,
          level: 'high',
          referenceId: item._id,
          referenceModel: 'Inventory',
          status: 'active',
        });
      }
    }

    if (item.currentStock <= 0) {
      await Alert.create({
        farmId: req.farmId,
        type: 'inventory',
        title: 'Stock Depleted',
        description: `${item.name} is out of stock. Reorder immediately.`,
        level: 'critical',
        referenceId: item._id,
        referenceModel: 'Inventory',
        status: 'active',
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    logger.error('[Client Inventory] Update stock failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update stock.',
    });
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/client/inventory/:id
// @access  Private (farmAdmin only)
const deleteItem = async (req, res) => {
  try {
    const item = await Inventory.findOneAndDelete({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found.',
      });
    }

    await Alert.updateMany(
      { farmId: req.farmId, referenceId: item._id, status: 'active' },
      { status: 'resolved' }
    );

    res.status(200).json({
      success: true,
      message: 'Item deleted.',
    });
  } catch (error) {
    logger.error('[Client Inventory] Delete failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete item.',
    });
  }
};

module.exports = {
  getInventory,
  addItem,
  updateStock,
  deleteItem,
};