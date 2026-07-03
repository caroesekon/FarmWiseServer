require('./scripts/dnsSet');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const connectDB = require('./config/db');
const initializeScheduler = require('./scheduler/index');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const logger = require('./utils/logger');

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

let redis = null;
if (process.env.REDIS_ENABLED === 'true') {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.on('connect', () => logger.info('[Redis] Connected'));
  redis.on('error', (err) => logger.warn('[Redis] Error', { error: err.message }));
}

connectDB();

mongoose.connection.setMaxListeners(20);

app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

if (redis) {
  app.use((req, res, next) => {
    req.redis = redis;
    next();
  });
}

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: `Welcome to ${process.env.APP_NAME} API`,
    version: process.env.API_VERSION,
    environment: process.env.NODE_ENV,
    documentation: `${process.env.APP_URL}/api`,
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: `${process.env.APP_NAME} API`,
    version: process.env.API_VERSION,
    endpoints: {
      admin: '/api/admin',
      client: '/api',
      health: '/health',
    },
    redis: redis?.status === 'ready' ? 'connected' : 'disabled',
    status: 'operational',
  });
});

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    success: true,
    message: 'Server is running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    redis: redis?.status === 'ready' ? 'connected' : 'disabled',
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
    },
    nodeVersion: process.version,
    pid: process.pid,
  });
});

app.get('/api/support', async (req, res) => {
  try {
    const SystemConfig = require('./models/admin/SystemConfig');
    
    const [supportPhone, supportEmail, supportInfo] = await Promise.all([
      SystemConfig.findOne({ key: 'supportPhone' }),
      SystemConfig.findOne({ key: 'supportEmail' }),
      SystemConfig.findOne({ key: 'supportInfo' }),
    ]);

    const phone = supportInfo?.value?.phone || supportPhone?.value || '';
    const email = supportInfo?.value?.email || supportEmail?.value || '';

    res.status(200).json({
      success: true,
      data: { phone, email },
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: { phone: '', email: '' },
    });
  }
});
app.use('/api/admin', require('./routes/admin/index'));
app.use('/api', require('./routes/client/index'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (redis) {
    try {
      await redis.connect();
    } catch {
      redis = null;
    }
  }

  const server = app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║          🌾  F A R M W I S E         ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
    console.log(`  App:      ${process.env.APP_NAME}`);
    console.log(`  Version:  ${process.env.API_VERSION}`);
    console.log(`  Port:     ${PORT}`);
    console.log(`  Mode:     ${process.env.NODE_ENV}`);
    console.log(`  Redis:    ${redis?.status === 'ready' ? 'Connected' : 'Disabled'}`);
    console.log(`  DB:       MongoDB`);
    console.log('');

    initializeScheduler();
  });

  const gracefulShutdown = async (signal) => {
    logger.info(`[Server] ${signal} received — shutting down gracefully`);

    server.close(async () => {
      logger.info('[Server] HTTP server closed');

      try {
        if (redis?.status === 'ready') {
          await redis.quit();
          logger.info('[Redis] Disconnected');
        }
      } catch (err) {
        logger.error('[Redis] Disconnect error', { error: err.message });
      }

      try {
        await mongoose.connection.close();
        logger.info('[DB] MongoDB disconnected');
      } catch (err) {
        logger.error('[DB] Disconnect error', { error: err.message });
      }

      logger.info('[Server] Shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('[Server] Forced shutdown after 10s');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();

process.on('unhandledRejection', (err) => {
  logger.error('[Server] Unhandled rejection', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('[Server] Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

module.exports = app;