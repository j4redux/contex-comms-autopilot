import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import os from 'os';

class Logger {
  constructor(agentName = null) {
    this.agentName = agentName;
    this.logsDir = path.join(os.homedir(), '.vibekit', 'logs');
    this.sessionId = Date.now().toString();
    this.initializeLogging();
  }

  async initializeLogging() {
    await fs.ensureDir(this.logsDir);
  }

  getLogFilePath(agentName = null) {
    const agent = agentName || this.agentName || 'general';
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logsDir, `${agent}-${date}.log`);
  }

  async log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      agent: this.agentName,
      sessionId: this.sessionId,
      message,
      metadata
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    const logFile = this.getLogFilePath();

    try {
      await fs.appendFile(logFile, logLine);
      
      if (process.env.VIBEKIT_DEBUG) {
        const colorMap = {
          INFO: chalk.blue,
          WARN: chalk.yellow,
          ERROR: chalk.red,
          DEBUG: chalk.gray
        };
        const colorFn = colorMap[level.toUpperCase()] || chalk.white;
        console.log(colorFn(`[${timestamp}] ${level.toUpperCase()}: ${message}`));
        
        // Log analytics metadata if present
        if (metadata.inputTokens || metadata.outputTokens || metadata.duration) {
          console.log(chalk.gray(`  Analytics: ${JSON.stringify({
            tokens: (metadata.inputTokens || 0) + (metadata.outputTokens || 0),
            duration: metadata.duration,
            files: metadata.filesChanged || 0
          })}`));
        }
      }
    } catch (error) {
      console.error(chalk.red('Failed to write log:'), error.message);
    }
  }

  async viewLogs(options = {}) {
    const { agent, lines = 50 } = options;
    const logFiles = [];

    if (!await fs.pathExists(this.logsDir)) {
      console.log(chalk.yellow('No logs found'));
      return;
    }

    if (agent) {
      const files = await fs.readdir(this.logsDir);
      const agentFiles = files.filter(file => file.startsWith(`${agent}-`));
      logFiles.push(...agentFiles.map(file => path.join(this.logsDir, file)));
    } else {
      const files = await fs.readdir(this.logsDir);
      logFiles.push(...files.map(file => path.join(this.logsDir, file)));
    }

    if (logFiles.length === 0) {
      console.log(chalk.yellow('No logs found'));
      return;
    }

    const allLogs = [];
    for (const logFile of logFiles) {
      try {
        const content = await fs.readFile(logFile, 'utf8');
        const logs = content.trim().split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        allLogs.push(...logs);
      } catch (error) {
        console.error(chalk.red(`Failed to read ${logFile}:`), error.message);
      }
    }

    allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const recentLogs = allLogs.slice(-lines);

    recentLogs.forEach(log => {
      const colorMap = {
        INFO: chalk.blue,
        WARN: chalk.yellow,
        ERROR: chalk.red,
        DEBUG: chalk.gray
      };
      const colorFn = colorMap[log.level] || chalk.white;
      const agentTag = log.agent ? chalk.cyan(`[${log.agent}]`) : '';
      
      console.log(
        chalk.gray(log.timestamp),
        colorFn(`[${log.level}]`),
        agentTag,
        log.message
      );
      
      if (log.metadata && Object.keys(log.metadata).length > 0) {
        console.log(chalk.gray('  Metadata:'), JSON.stringify(log.metadata, null, 2));
      }
    });
  }

  async cleanLogs() {
    try {
      const files = await fs.readdir(this.logsDir);
      for (const file of files) {
        await fs.remove(path.join(this.logsDir, file));
      }
    } catch (error) {
      console.error(chalk.red('Failed to clean logs:'), error.message);
    }
  }
}

export default Logger;