const Task = require('../../models/client/Task');
const logger = require('../../utils/logger');

// @desc    Get tasks
// @route   GET /api/client/tasks
// @access  Private (all client roles)
const getTasks = async (req, res) => {
  try {
    const { status, category, assignedTo, priority, page = 1, limit = 30 } = req.query;

    const query = { farmId: req.farmId };

    if (status) query.status = status;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;
    if (priority) query.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find(query)
      .sort({ dueDate: 1, priority: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('assignedTo', 'name role')
      .populate('assignedBy', 'name');

    const total = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: tasks,
    });
  } catch (error) {
    logger.error('[Client Task] Get failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks.',
    });
  }
};

// @desc    Create task
// @route   POST /api/client/tasks
// @access  Private (farmAdmin, manager)
const createTask = async (req, res) => {
  try {
    const { title, description, category, assignedTo, dueDate, priority, notes } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title and category are required.',
      });
    }

    const task = await Task.create({
      farmId: req.farmId,
      title,
      description,
      category,
      assignedTo,
      assignedBy: req.user.id,
      dueDate,
      priority: priority || 'medium',
      notes,
    });

    logger.info('[Client Task] Created', { taskId: task._id, farmId: req.farmId });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    logger.error('[Client Task] Create failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create task.',
    });
  }
};

// @desc    Update task status
// @route   PUT /api/client/tasks/:id
// @access  Private (all client roles)
const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      farmId: req.farmId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    const { status, notes } = req.body;

    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date();
      }
    }
    if (notes !== undefined) task.notes = notes;
    task.updatedAt = new Date();

    await task.save();

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    logger.error('[Client Task] Update failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update task.',
    });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
};