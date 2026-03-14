const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const cron = require('node-cron');
const config = require('./config/config');
const WebSocketServer = require('./websocket/socketServer');
const notificationService = require('./services/notificationService');
const logger = require('./utils/logger');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/validators');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS
const corsOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:3000'])
  : ['http://localhost:3000', 'http://localhost:8081', 'http://localhost:19006'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize inputs
app.use(sanitizeInput);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req, res, duration);
  });
  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/stress', require('./routes/stress'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/university', require('./routes/university'));
app.use('/api/universities', require('./routes/universities'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Smart Student Life Manager API v2.0 is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    websocket: 'enabled',
    features: ['ai', 'mobile', 'university-integration', 'realtime-chat']
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle favicon requests (prevent 404 errors)
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Initialize WebSocket Server
let wsServer;
try {
  wsServer = new WebSocketServer(server);
  logger.info('WebSocket server initialized');
} catch (error) {
  logger.error('Failed to initialize WebSocket server', { error: error.message });
}

// Scheduled Tasks
cron.schedule('* * * * *', async () => {
  try {
    logger.debug('Processing scheduled notifications');
    await notificationService.processScheduledNotifications();
  } catch (error) {
    logger.error('Scheduled task error', { error: error.message });
  }
});

cron.schedule('0 8 * * *', async () => {
  try {
    const db = require('./database/connection');
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const users = await db.query('SELECT id FROM users WHERE is_active = TRUE');
    logger.info(`Running daily stress analysis for ${users.length} users`);
    for (const user of users) {
      try {
        const tasks = await db.query(
          `SELECT * FROM tasks WHERE user_id = ? AND status != 'completed'`,
          [user.id]
        );
        const taskCount = tasks.length;
        const urgentCount = tasks.filter(t => {
          const d = new Date(t.deadline);
          return d >= now && d <= in3Days;
        }).length;
        const score = Math.min(100, (taskCount * 10) + (urgentCount * 20));
        const level = score <= 30 ? 'normal' : score <= 60 ? 'moderate' : 'high';
        const existing = await db.query(
          'SELECT id FROM stress_analysis WHERE user_id = ? AND analysis_date = ?',
          [user.id, today]
        );
        if (existing.length === 0) {
          await db.query(
            `INSERT INTO stress_analysis (user_id, analysis_date, task_count, urgent_task_count, stress_score, stress_level) VALUES (?, ?, ?, ?, ?, ?)`,
            [user.id, today, taskCount, urgentCount, score, level]
          );
        }
      } catch (userErr) {
        logger.error(`Stress calc failed for user ${user.id}`, { error: userErr.message });
      }
    }
    logger.info('Daily stress analysis completed');
  } catch (error) {
    logger.error('Stress analysis error', { error: error.message });
  }
});

// Start server
const PORT = config.port || 3000;
server.listen(PORT, () => {
  logger.info(`Smart Student Life Manager v2.0 started on port ${PORT}`);
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   Smart Student Life Manager v2.0                        ║
║   ═══════════════════════════════════                    ║
║                                                          ║
║   ✅ Server running on port ${PORT}                      ║
║   📡 WebSocket enabled                                   ║
║   🧠 Advanced AI integration                             ║
║   🏫 University integration ready                        ║
║   📱 Mobile app API ready                                ║
║                                                          ║
║   API: http://localhost:${PORT}/api/health                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

module.exports = { app, server, wsServer };
