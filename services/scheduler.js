const logger = require('../utils/logger');

const scheduledTasks = [];

const addTask = (name, cronExpression, taskFn) => {
  scheduledTasks.push({ name, cronExpression, taskFn });
  logger.info('[Scheduler] Task registered', { name, cron: cronExpression });
};

const startAll = () => {
  logger.info(`[Scheduler] Starting ${scheduledTasks.length} tasks`);

  for (const task of scheduledTasks) {
    task.taskFn();
    logger.info(`[Scheduler] Task started: ${task.name}`);
  }
};

const runTask = async (name, fn) => {
  try {
    logger.info(`[Scheduler] Running task: ${name}`);
    await fn();
    logger.info(`[Scheduler] Task completed: ${name}`);
  } catch (error) {
    logger.error(`[Scheduler] Task failed: ${name}`, { error: error.message });
  }
};

module.exports = { addTask, startAll, runTask };