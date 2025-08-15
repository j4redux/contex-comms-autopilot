import BaseAgent from './base.js';
import { spawn } from 'child_process';
import chalk from 'chalk';

class ClaudeAgent extends BaseAgent {
  constructor(logger, options = {}) {
    super('claude', logger, options);
  }

  getAgentCommand() {
    return 'claude';
  }

  async executeAgent(args, cwd) {
    const command = 'claude';
    
    try {
      return await this.createChildProcess(command, args, { cwd });
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(chalk.red('Error: Claude CLI not found. Please install it first:'));
        console.error(chalk.yellow('  curl -sSL https://install.anthropic.com | bash'));
        console.error(chalk.yellow('  or visit: https://docs.anthropic.com/en/docs/claude-code'));
        process.exit(1);
      }
      throw error;
    }
  }

  async checkInstallation() {
    return new Promise((resolve) => {
      const child = spawn('claude', ['--version'], { stdio: 'ignore' });
      child.on('close', (code) => {
        resolve(code === 0);
      });
      child.on('error', () => {
        resolve(false);
      });
    });
  }
}

export default ClaudeAgent;