const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

const isProduction = process.env.NODE_ENV === 'production';

const logger = {
  error: (message, meta) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', message, meta));
    }
  },

  warn: (message, meta) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message, meta));
    }
  },

  info: (message, meta) => {
    if (isProduction && message.startsWith('[Scheduler]') && currentLevel >= LOG_LEVELS.info) {
      console.log(formatMessage('info', message, meta));
      return;
    }
    if (!isProduction && currentLevel >= LOG_LEVELS.info) {
      console.log(formatMessage('info', message, meta));
    }
  },

  debug: (message, meta) => {
    if (!isProduction && currentLevel >= LOG_LEVELS.debug) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
};

module.exports = logger;