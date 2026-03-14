// Logger Utility for Application
const fs = require('fs');
const path = require('path');

// Create logs directory if not exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
  constructor() {
    this.logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    this.errorFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
  }

  writeToFile(file, message) {
    fs.appendFile(file, message, (err) => {
      if (err) console.error('Failed to write log:', err);
    });
  }

  info(message, meta) {
    const formatted = this.formatMessage('INFO', message, meta);
    console.log(`[INFO] ${message}`);
    this.writeToFile(this.logFile, formatted);
  }

  error(message, meta) {
    const formatted = this.formatMessage('ERROR', message, meta);
    console.error(`[ERROR] ${message}`);
    this.writeToFile(this.logFile, formatted);
    this.writeToFile(this.errorFile, formatted);
  }

  warn(message, meta) {
    const formatted = this.formatMessage('WARN', message, meta);
    console.warn(`[WARN] ${message}`);
    this.writeToFile(this.logFile, formatted);
  }

  debug(message, meta) {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('DEBUG', message, meta);
      console.log(`[DEBUG] ${message}`);
      this.writeToFile(this.logFile, formatted);
    }
  }

  request(req, res, duration) {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    this.info('HTTP Request', meta);
  }
}

module.exports = new Logger();
