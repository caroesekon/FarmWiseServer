const Alert = require('../../models/client/Alert');
const logger = require('../../utils/logger');

// @desc    Get alerts
// @route   GET /api/client/alerts
// @access  Private (all client roles)
const getAlerts = async (req, res) => {
  try {
    const { status, level, type, page = 1, limit = 30 } = req.query;

    const query = { farmId: req.farmId };

    if (status) query.status = status;
    if (level) query.level = level;
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const alerts = await Alert.find(query)
      .sort({ level: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Alert.countDocuments(query);

    const criticalCount = await Alert.countDocuments({
      farmId: req.farmId,
      status: 'active',
      level: 'critical',
    });

    const highCount = await Alert.countDocuments({
      farmId: req.farmId,
      status: 'active',
      level: 'high',
    });

    res.status(200).json({
      success: true,
      count: alerts.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      summary: {
        critical: criticalCount,
        high: highCount,
      },
      data: alerts,
    });
  } catch (error) {
    logger.error('[Client Alert] Get failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts.',
    });
  }
};

// @desc    Acknowledge alert
// @route   PUT /api/client/alerts/:id/acknowledge
// @access  Private (all client roles)
const acknowledgeAlert = async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found.',
      });
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = req.user.id;
    alert.acknowledgedAt = new Date();
    alert.updatedAt = new Date();

    await alert.save();

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('[Client Alert] Acknowledge failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert.',
    });
  }
};

// @desc    Dismiss alert
// @route   PUT /api/client/alerts/:id/dismiss
// @access  Private (farmAdmin, manager)
const dismissAlert = async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found.',
      });
    }

    alert.status = 'dismissed';
    alert.updatedAt = new Date();

    await alert.save();

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('[Client Alert] Dismiss failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss alert.',
    });
  }
};

module.exports = {
  getAlerts,
  acknowledgeAlert,
  dismissAlert,
};