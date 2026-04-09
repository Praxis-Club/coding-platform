import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { getLanguageConfig, Language } from './languages.config';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export interface ExecutionResult {
  output: string;
  error: string | null;
  executionTime: number;
  memoryUsed: number;
  exitCode: number;
  timedOut: boolean;
}

export class DockerService {
  private tempDir = join(process.cwd(), 'temp');

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory:', error);
    }
  }

  async executeCode(
    code: string,
    language: Language | string,
    input: string = '',
    timeLimit?: number
  ): Promise<ExecutionResult> {
    if (!env.DOCKER_ENABLED) {
      return this.executeLocally(code, language, input);
    }

    const config = getLanguageConfig(language);
    const executionId = randomUUID();
    const workDir = join(this.tempDir, executionId);
    const timeout = timeLimit || config.timeout;

    try {
      // Create working directory
      await mkdir(workDir, { recursive: true });

      // Write code to file
      const fileName = this.getFileName(language);
      const filePath = join(workDir, fileName);
      await writeFile(filePath, code);

      // Write input to file
      const inputPath = join(workDir, 'input.txt');
      await writeFile(inputPath, input);

      const startTime = Date.now();
      let timedOut = false;

      // Build Docker command
      const dockerCmd = this.buildDockerCommand(
        config,
        workDir,
        timeout
      );

      logger.debug(`Executing: ${dockerCmd}`);

      let output = '';
      let error = '';
      let exitCode = 0;

      try {
        const { stdout, stderr } = await execAsync(dockerCmd, {
          timeout,
          maxBuffer: 1024 * 1024, // 1MB
        });
        output = stdout;
        error = stderr;
      } catch (err: any) {
        if (err.killed || err.signal === 'SIGTERM') {
          timedOut = true;
          error = 'Execution timed out';
        } else {
          error = err.stderr || err.message;
          exitCode = err.code || 1;
        }
      }

      const executionTime = Date.now() - startTime;

      // Cleanup
      await this.cleanup(workDir);

      return {
        output: output.trim(),
        error: error ? error.trim() : null,
        executionTime,
        memoryUsed: 0, // TODO: Implement memory tracking
        exitCode,
        timedOut,
      };
    } catch (error: any) {
      logger.error('Execution error:', error);
      await this.cleanup(workDir);
      
      return {
        output: '',
        error: error.message || 'Execution failed',
        executionTime: 0,
        memoryUsed: 0,
        exitCode: 1,
        timedOut: false,
      };
    }
  }

  private buildDockerCommand(
    config: any,
    workDir: string,
    timeout: number
  ): string {
    const timeoutSeconds = Math.ceil(timeout / 1000);
    
    let command = `docker run --rm `;
    command += `--network none `; // Disable network
    command += `--memory="${env.MAX_MEMORY}m" `; // Memory limit
    command += `--cpus="1" `; // CPU limit
    command += `--pids-limit=50 `; // Process limit
    command += `-v "${workDir}:/workspace" `;
    command += `-w /workspace `;
    command += `${config.image} `;
    command += `timeout ${timeoutSeconds}s sh -c "`;

    if (config.compileCommand) {
      command += `${config.compileCommand} && `;
    }

    command += `${config.runCommand} < input.txt"`;

    return command;
  }

  private getFileName(language: string): string {
    const config = getLanguageConfig(language);
    
    switch (language.toLowerCase()) {
      case 'java':
        return 'Solution.java';
      default:
        return `solution.${config.fileExtension}`;
    }
  }

  private async cleanup(workDir: string) {
    try {
      // Remove directory and all contents
      await execAsync(`rm -rf "${workDir}"`);
    } catch (error) {
      logger.error('Cleanup error:', error);
    }
  }

  private async executeLocally(
    code: string,
    language: string,
    input: string
  ): Promise<ExecutionResult> {
    logger.warn('Executing code locally without Docker isolation - NOT SECURE!');
    
    const executionId = randomUUID();
    const workDir = join(this.tempDir, executionId);
    const config = getLanguageConfig(language);
    
    try {
      await mkdir(workDir, { recursive: true });
      const fileName = this.getFileName(language);
      const filePath = join(workDir, fileName);
      await writeFile(filePath, code);
      await writeFile(join(workDir, 'input.txt'), input);

      const startTime = Date.now();
      
      // Build local run command
      let runCmd = '';
      if (config.compileCommand && config.compileCommand.trim() !== '') {
        runCmd = `${config.compileCommand.replace('solution.', 'solution.').replace('Solution.', 'Solution.')} && `;
      }
      
      if (config.runCommand) {
        runCmd += `${config.runCommand} < input.txt`;
      } else {
        throw new Error(`Run command not defined for language: ${language}`);
      }

      let output = '';
      let error = '';
      let exitCode = 0;
      let timedOut = false;

      try {
        const { stdout, stderr } = await execAsync(runCmd, {
          cwd: workDir,
          timeout: config.timeout,
          maxBuffer: 1024 * 1024
        });
        output = stdout;
        error = stderr;
      } catch (err: any) {
        if (err.killed) {
          timedOut = true;
          error = 'Execution timed out';
        } else {
          error = err.stderr || err.message;
          exitCode = err.code || 1;
        }
      }

      const executionTime = Date.now() - startTime;
      await this.cleanup(workDir);

      return {
        output: output.trim(),
        error: error ? error.trim() : null,
        executionTime,
        memoryUsed: 0,
        exitCode,
        timedOut
      };
    } catch (err: any) {
      await this.cleanup(workDir);
      return {
        output: '',
        error: err.message,
        executionTime: 0,
        memoryUsed: 0,
        exitCode: 1,
        timedOut: false
      };
    }
  }

  async testDockerAvailability(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch (error) {
      logger.error('Docker is not available:', error);
      return false;
    }
  }
}
