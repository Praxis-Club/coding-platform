import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { ExecutionResult } from './docker.service';

export class Judge0Service {
  private apiKey: string;
  private host: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = ''; // Force empty to ignore RapidAPI headers
    this.host = 'ce.judge0.com';
    this.baseUrl = 'https://ce.judge0.com';
  }

  async executeCode(
    languageId: number,
    sourceCode: string,
    stdin: string
  ): Promise<ExecutionResult> {
    try {
      // Submit code
      const response = await axios.post(
        `${this.baseUrl}/submissions`,
        {
          language_id: languageId,
          source_code: sourceCode,
          stdin: stdin,
        },
        {
          params: { base64_encoded: 'false', wait: 'true' },
          headers: this.apiKey ? {
            'x-rapidapi-key': this.apiKey,
            'x-rapidapi-host': this.host,
            'Content-Type': 'application/json',
          } : {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;
      
      // Map Judge0 status to our ExecutionResult
      // Status IDs: 3 = Accepted, 4 = Wrong Answer, 5 = Time Limit Exceeded, 
      // 6 = Compilation Error, 7-12 = Runtime Error
      
      return {
        output: data.stdout || '',
        error: data.stderr || data.compile_output || (data.status.id > 3 ? data.status.description : null),
        executionTime: Math.floor(parseFloat(data.time || '0') * 1000),
        memoryUsed: data.memory || 0,
        exitCode: data.status.id === 3 ? 0 : 1,
        timedOut: data.status.id === 5,
      };
    } catch (error: any) {
      logger.error('Judge0 execution error:', error.response?.data || error.message);
      return {
        output: '',
        error: error.response?.data?.message || error.message || 'Judge0 execution failed',
        executionTime: 0,
        memoryUsed: 0,
        exitCode: 1,
        timedOut: false,
      };
    }
  }
}
