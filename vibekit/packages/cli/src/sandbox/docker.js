import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

class Docker {
  constructor(projectRoot, logger, options = {}) {
    this.projectRoot = projectRoot;
    this.logger = logger;
    this.sandboxRoot = path.join(projectRoot, '.vibekit', '.vibekit-sandbox');
    this.workspaceDir = path.join(this.sandboxRoot, 'workspace');
    this.imageName = 'vibekit-sandbox';
    this.persistentContainerName = 'vibekit-persistent';
    this.containerName = `vibekit-${Date.now()}`;
    
    this.options = {
      networkMode: 'bridge', // Network enabled by default for AI agents
      memoryLimit: '1g',
      cpuLimit: '1.0',
      timeoutMinutes: 30,
      usePersistent: true, // Use persistent container by default
      ...options
    };
  }

  async buildImage() {
    await this.logger.log('info', 'Building Docker sandbox image with pre-installed agents');
    
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('docker', [
        'build',
        '-t', this.imageName,
        '.'
      ], {
        cwd: this.projectRoot,
        stdio: 'inherit' // Show build output to user
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          this.logger.log('info', 'Docker image built successfully with coding agents');
          resolve();
        } else {
          this.logger.log('error', 'Failed to build Docker image', { exitCode: code });
          reject(new Error(`Docker build failed with code ${code}`));
        }
      });

      buildProcess.on('error', (error) => {
        this.logger.log('error', 'Docker build process error', { error: error.message });
        reject(error);
      });
    });
  }

  async checkDockerInstallation() {
    return new Promise((resolve) => {
      // Check if Docker daemon is running by trying to ping it
      const child = spawn('docker', ['info'], { stdio: 'ignore' });
      child.on('close', (code) => {
        resolve(code === 0);
      });
      child.on('error', () => {
        resolve(false);
      });
    });
  }

  async checkImageExists() {
    return new Promise((resolve) => {
      const child = spawn('docker', ['image', 'inspect', this.imageName], { stdio: 'ignore' });
      child.on('close', (code) => {
        resolve(code === 0);
      });
      child.on('error', () => {
        resolve(false);
      });
    });
  }

  async checkPersistentContainer() {
    return new Promise((resolve) => {
      const child = spawn('docker', ['container', 'inspect', this.persistentContainerName], { stdio: 'ignore' });
      child.on('close', (code) => {
        resolve(code === 0);
      });
      child.on('error', () => {
        resolve(false);
      });
    });
  }

  async isPersistentContainerRunning() {
    return new Promise((resolve) => {
      const child = spawn('docker', ['ps', '-q', '-f', `name=${this.persistentContainerName}`], { stdio: 'pipe' });
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        resolve(code === 0 && output.trim().length > 0);
      });
      
      child.on('error', () => {
        resolve(false);
      });
    });
  }

  async checkContainerNetworkSettings() {
    // For simplicity, always restart if network settings might have changed
    // In practice, we could inspect the container and compare network modes
    return new Promise((resolve) => {
      const child = spawn('docker', ['inspect', this.persistentContainerName, '--format', '{{.HostConfig.NetworkMode}}'], { stdio: 'pipe' });
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString().trim();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          // Check if current network mode matches desired
          const currentNetworkMode = output.trim();
          const desiredNetworkMode = this.options.networkMode;
          resolve(currentNetworkMode !== desiredNetworkMode);
        } else {
          resolve(false); // Container probably doesn't exist
        }
      });
      
      child.on('error', () => {
        resolve(false);
      });
    });
  }

  async startPersistentContainer() {
    await this.logger.log('info', 'Starting persistent Docker container for fast execution');

    if (!await this.checkImageExists()) {
      await this.buildImage();
    }

    // Check if existing container has different network settings
    const needsRestart = await this.checkContainerNetworkSettings();

    // Remove existing container if it exists and needs restart or is stopped
    if (await this.checkPersistentContainer() && (needsRestart || !await this.isPersistentContainerRunning())) {
      if (await this.isPersistentContainerRunning()) {
        await this.stopPersistentContainer();
      }
      await new Promise((resolve) => {
        const remove = spawn('docker', ['rm', this.persistentContainerName], { stdio: 'ignore' });
        remove.on('close', () => resolve());
        remove.on('error', () => resolve());
      });
    }

    // Start new persistent container if not running
    if (!await this.isPersistentContainerRunning()) {
      return new Promise((resolve, reject) => {
        const dockerArgs = [
          'run',
          '-d', // Detached
          '--name', this.persistentContainerName,
          '--memory', this.options.memoryLimit,
          '--cpus', this.options.cpuLimit,
          '--network', this.options.networkMode,
          '--tmpfs', '/tmp:rw,noexec,nosuid,size=100m',
          '--security-opt', 'no-new-privileges',
          '--cap-drop', 'ALL',
          this.imageName
        ];

        const startProcess = spawn('docker', dockerArgs, { stdio: 'inherit' });

        startProcess.on('close', (code) => {
          if (code === 0) {
            this.logger.log('info', 'Persistent container started successfully');
            resolve();
          } else {
            reject(new Error(`Failed to start persistent container with code ${code}`));
          }
        });

        startProcess.on('error', (error) => {
          reject(error);
        });
      });
    }
  }

  async prepareWorkspace() {
    await fs.ensureDir(this.workspaceDir);
    
    // Copy important files to workspace
    const importantFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'tsconfig.json',
      '.gitignore',
      '.env.example'
    ];

    const importantDirs = [
      'src',
      'lib',
      'components',
      'pages',
      'api',
      'utils',
      'config',
      'public',
      'assets'
    ];

    for (const file of importantFiles) {
      const srcPath = path.join(this.projectRoot, file);
      const destPath = path.join(this.workspaceDir, file);
      
      if (await fs.pathExists(srcPath)) {
        await fs.copy(srcPath, destPath);
      }
    }

    for (const dir of importantDirs) {
      const srcPath = path.join(this.projectRoot, dir);
      const destPath = path.join(this.workspaceDir, dir);
      
      if (await fs.pathExists(srcPath)) {
        await fs.copy(srcPath, destPath);
      }
    }

    // Copy git directory for context (read-only)
    const gitPath = path.join(this.projectRoot, '.git');
    const destGitPath = path.join(this.workspaceDir, '.git');
    
    if (await fs.pathExists(gitPath)) {
      await fs.copy(gitPath, destGitPath);
    }
  }

  async findClaudeCLI() {
    // Try to find Claude CLI on the host system
    const possiblePaths = [
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      process.env.HOME + '/.local/bin/claude',
      '/home/' + process.env.USER + '/.local/bin/claude'
    ];

    for (const claudePath of possiblePaths) {
      try {
        if (await fs.pathExists(claudePath)) {
          return claudePath;
        }
      } catch (error) {
        // Continue checking other paths
      }
    }

    // Try to find using 'which'
    return new Promise((resolve) => {
      const which = spawn('which', ['claude'], { stdio: 'pipe' });
      let output = '';
      
      which.stdout.on('data', (data) => {
        output += data.toString().trim();
      });
      
      which.on('close', (code) => {
        if (code === 0 && output) {
          resolve(output);
        } else {
          resolve(null);
        }
      });
    });
  }

  async runCommand(command, args = [], options = {}) {
    if (!await this.checkDockerInstallation()) {
      throw new Error('Docker is not installed or not running');
    }

    await this.prepareWorkspace();

    if (this.options.usePersistent) {
      return await this.runInPersistentContainer(command, args, options);
    } else {
      return await this.runInFreshContainer(command, args, options);
    }
  }

  async runInPersistentContainer(command, args = [], options = {}) {
    // Ensure persistent container is running
    await this.startPersistentContainer();

    // Copy workspace files into the running container
    await new Promise((resolve, reject) => {
      const copyProcess = spawn('docker', [
        'cp', `${this.workspaceDir}/.`, `${this.persistentContainerName}:/workspace/`
      ], { stdio: 'inherit' });

      copyProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to copy workspace to container`));
        }
      });
    });

    // First check if command exists in container
    const checkArgs = [
      'exec',
      this.persistentContainerName,
      'bash', '-c', `which ${command} || echo "Command ${command} not found"`
    ];

    await new Promise((resolve) => {
      const checkProcess = spawn('docker', checkArgs, { stdio: 'inherit' });
      checkProcess.on('close', () => resolve());
    });

    // Execute command in persistent container
    const execArgs = [
      'exec',
      '-i', // Interactive (always safe)
      '-w', '/workspace', // Working directory
    ];

    // Only add TTY if we're actually in a TTY
    if (process.stdout.isTTY && process.stdin.isTTY) {
      execArgs.push('-t'); // TTY for proper terminal UI
    }

    execArgs.push(this.persistentContainerName, command, ...args);

    await this.logger.log('info', `Running command in persistent container: ${command} ${args.join(' ')}`, {
      containerName: this.persistentContainerName,
      execArgs: execArgs.length
    });

    return new Promise((resolve, reject) => {
      console.log(chalk.blue(`[vibekit] Running in persistent Docker: ${command} ${args.join(' ')}`));
      
      const startTime = Date.now();
      const execProcess = spawn('docker', execArgs, {
        stdio: 'inherit',
        detached: false,
        ...options
      });

      const timeout = setTimeout(() => {
        execProcess.kill('SIGTERM');
        reject(new Error(`Command timed out after ${this.options.timeoutMinutes} minutes`));
      }, this.options.timeoutMinutes * 60 * 1000);

      execProcess.on('close', (code) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        console.log(chalk.blue(`[vibekit] Persistent Docker command exited with code ${code} (${duration}ms)`));
        
        // Copy results back from container
        this.copyResultsBack().then(() => {
          resolve({ code, duration });
        }).catch(() => {
          resolve({ code, duration }); // Don't fail if copy back fails
        });
      });

      execProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Handle process termination
      process.on('SIGINT', () => {
        execProcess.kill('SIGINT');
      });

      process.on('SIGTERM', () => {
        execProcess.kill('SIGTERM');
      });
    });
  }

  async runInFreshContainer(command, args = [], options = {}) {
    if (!await this.checkImageExists()) {
      await this.buildImage();
    }

    const dockerArgs = [
      'run',
      '--rm', // Remove container after run
      '--name', this.containerName,
      '--workdir', '/workspace',
      '--volume', `${this.workspaceDir}:/workspace`,
      '--memory', this.options.memoryLimit,
      '--cpus', this.options.cpuLimit,
      '--network', this.options.networkMode,
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=100m',
      '--security-opt', 'no-new-privileges',
      '--cap-drop', 'ALL',
    ];

    // Add timeout if specified
    if (this.options.timeoutMinutes) {
      dockerArgs.push('--stop-timeout', (this.options.timeoutMinutes * 60).toString());
    }

    dockerArgs.push(this.imageName);
    dockerArgs.push(command);
    dockerArgs.push(...args);

    await this.logger.log('info', `Running command in Docker container: ${command} ${args.join(' ')}`, {
      containerName: this.containerName,
      dockerArgs
    });

    return new Promise((resolve, reject) => {
      console.log(chalk.blue(`[vibekit] Running in Docker: ${command} ${args.join(' ')}`));
      
      const dockerProcess = spawn('docker', dockerArgs, {
        stdio: 'inherit',
        ...options
      });

      const timeout = setTimeout(() => {
        dockerProcess.kill('SIGTERM');
        reject(new Error(`Command timed out after ${this.options.timeoutMinutes} minutes`));
      }, this.options.timeoutMinutes * 60 * 1000);

      dockerProcess.on('close', (code) => {
        clearTimeout(timeout);
        console.log(chalk.blue(`[vibekit] Docker container exited with code ${code}`));
        resolve({ code });
      });

      dockerProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Handle process termination
      process.on('SIGINT', () => {
        this.stopContainer();
      });

      process.on('SIGTERM', () => {
        this.stopContainer();
      });
    });
  }

  async stopContainer() {
    try {
      await this.logger.log('info', `Stopping Docker container: ${this.containerName}`);
      
      const stopProcess = spawn('docker', ['stop', this.containerName], { stdio: 'ignore' });
      
      return new Promise((resolve) => {
        stopProcess.on('close', () => {
          resolve();
        });
        stopProcess.on('error', () => {
          resolve(); // Ignore errors when stopping
        });
      });
    } catch (error) {
      // Ignore errors when stopping container
    }
  }

  async copyResultsBack() {
    // Copy changed files back from persistent container
    return new Promise((resolve, reject) => {
      const copyProcess = spawn('docker', [
        'cp', `${this.persistentContainerName}:/workspace/.`, this.workspaceDir
      ], { stdio: 'ignore' });

      copyProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to copy results back from container`));
        }
      });
    });
  }

  async stopPersistentContainer() {
    if (await this.isPersistentContainerRunning()) {
      await this.logger.log('info', 'Stopping persistent container');
      
      return new Promise((resolve) => {
        const stopProcess = spawn('docker', ['stop', this.persistentContainerName], { stdio: 'ignore' });
        stopProcess.on('close', () => resolve());
        stopProcess.on('error', () => resolve());
      });
    }
  }

  async cleanup() {
    // For persistent containers, don't stop - keep them warm
    if (!this.options.usePersistent) {
      await this.stopContainer();
      
      // Remove container if it exists
      try {
        const rmProcess = spawn('docker', ['rm', '-f', this.containerName], { stdio: 'ignore' });
        await new Promise((resolve) => {
          rmProcess.on('close', resolve);
          rmProcess.on('error', resolve);
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  async getWorkspaceChanges() {
    const changes = [];
    
    const walkDir = async (dir, relativePath = '') => {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        if (item.startsWith('.') && item !== '.gitignore') continue;
        
        const itemPath = path.join(dir, item);
        const relativeItemPath = path.join(relativePath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          await walkDir(itemPath, relativeItemPath);
        } else {
          const projectFile = path.join(this.projectRoot, relativeItemPath);
          
          if (!await fs.pathExists(projectFile)) {
            changes.push(relativeItemPath);
          } else {
            const sandboxContent = await fs.readFile(itemPath, 'utf8');
            const projectContent = await fs.readFile(projectFile, 'utf8');
            
            if (sandboxContent !== projectContent) {
              changes.push(relativeItemPath);
            }
          }
        }
      }
    };

    await walkDir(this.workspaceDir);
    return changes;
  }

  async syncChangesBack() {
    const changes = await this.getWorkspaceChanges();
    
    if (changes.length === 0) {
      await this.logger.log('info', 'No changes to sync from Docker sandbox');
      return [];
    }

    await this.logger.log('info', `Syncing ${changes.length} files from Docker sandbox`, { changes });

    for (const file of changes) {
      const sandboxFile = path.join(this.workspaceDir, file);
      const projectFile = path.join(this.projectRoot, file);
      
      if (await fs.pathExists(sandboxFile)) {
        await fs.ensureDir(path.dirname(projectFile));
        await fs.copy(sandboxFile, projectFile);
      }
    }

    return changes;
  }
}

export default Docker;