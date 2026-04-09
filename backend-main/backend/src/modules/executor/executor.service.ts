import { DockerService } from './docker.service';
import { Judge0Service } from './judge0.service';
import { getLanguageConfig, Language } from './languages.config';
import { env } from '../../config/env';
import { Semaphore } from '../../utils/semaphore';

const dockerService = new DockerService();
const judge0Service = new Judge0Service();
// Limit concurrent docker executions to 15 to prevent server saturation during exams.
const executorSemaphore = new Semaphore(15);

export class ExecutorService {
  async executeCode(language: Language, code: string, input: string = '') {
    if (env.JUDGE0_ENABLED) {
      const config = getLanguageConfig(language);
      const result = await judge0Service.executeCode(config.judge0Id, code, input);
      return {
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        success: result.exitCode === 0 && !result.timedOut,
        status: result.timedOut ? 'timeout' : (result.exitCode === 0 ? 'success' : 'error')
      };
    }
    
    // Wrap docker execution in a semaphore to handle high concurrency bursts safely.
    const result = await executorSemaphore.run(() => dockerService.executeCode(code, language, input));
    return {
      output: result.output,
      error: result.error,
      executionTime: result.executionTime,
      success: result.exitCode === 0 && !result.timedOut,
      status: result.timedOut ? 'timeout' : (result.exitCode === 0 ? 'success' : 'error')
    };
  }

  async executeWithDocker(language: Language, code: string, input: string = '') {
    if (env.JUDGE0_ENABLED) {
      const config = getLanguageConfig(language);
      const result = await judge0Service.executeCode(config.judge0Id, code, input);
      return {
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        success: result.exitCode === 0 && !result.timedOut
      };
    }

    const result = await executorSemaphore.run(() => dockerService.executeCode(code, language, input));
    
    return {
      output: result.output,
      error: result.error,
      executionTime: result.executionTime,
      success: result.exitCode === 0 && !result.timedOut
    };
  }
}
