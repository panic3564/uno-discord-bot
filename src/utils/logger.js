const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

class Logger {
  constructor() {
    this.logDir = join(__dirname, '../../logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    // Also write to log file
    const logFile = join(this.logDir, `bot-${new Date().toISOString().split('T')[0]}.log`);
    writeFileSync(logFile, logMessage, { flag: 'a' });
  }

  info(message) {
    this.log(message, 'info');
  }

  warn(message) {
    this.log(message, 'warn');
  }

  error(message) {
    this.log(message, 'error');
  }

  debug(message) {
    this.log(message, 'debug');
  }
}

module.exports = new Logger();
