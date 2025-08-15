import BaseAgent from './base.js';
import { spawn } from 'child_process';
import chalk from 'chalk';

class GeminiAgent extends BaseAgent {
  constructor(logger, options = {}) {
    super('gemini', logger, options);
  }

  getAgentCommand() {
    return 'gemini';
  }

  async executeAgent(args, cwd) {
    const command = 'gemini';
    
    try {
      return await this.createChildProcess(command, args, { cwd });
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(chalk.red('Error: Gemini CLI not found. Please install it first.'));
        console.error(chalk.yellow('  Installation instructions may vary depending on the Gemini CLI implementation'));
        process.exit(1);
      }
      throw error;
    }
  }

  async checkInstallation() {
    return new Promise((resolve) => {
      const child = spawn('gemini', ['--version'], { stdio: 'ignore' });
      child.on('close', (code) => {
        resolve(code === 0);
      });
      child.on('error', () => {
        resolve(false);
      });
    });
  }
}

export default GeminiAgent;