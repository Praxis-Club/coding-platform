/**
 * FastExecutor — high-performance local code execution for the "Run" button.
 *
 * Design goals:
 *  - spawn() over exec() — stream-based, no shell overhead
 *  - stdin piping — no input.txt file write
 *  - compile-once — C / C++ / Java compiled once, binary reused per test case
 *  - Promise.all — all test cases run in parallel
 *  - in-memory test case cache — no repeated DB fetches
 *  - per-process timeout via AbortController
 *
 * NOT for production submission grading — use DockerService for that.
 */

import { spawn } from 'child_process';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getLanguageConfig, Language } from './languages.config';

const TEMP_BASE = join(process.cwd(), 'temp_fast');
const DEFAULT_TIMEOUT_MS = 5000;

// ── In-memory test case cache ─────────────────────────────────────────────────
// key: questionId, value: { testCases, cachedAt }
const testCaseCache = new Map<string, { testCases: any[]; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function cacheTestCases(questionId: string, testCases: any[]) {
  testCaseCache.set(questionId, { testCases, cachedAt: Date.now() });
}

export function getCachedTestCases(questionId: string): any[] | null {
  const entry = testCaseCache.get(questionId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    testCaseCache.delete(questionId);
    return null;
  }
  return entry.testCases;
}

export function invalidateTestCaseCache(questionId: string) {
  testCaseCache.delete(questionId);
}

// ── Core types ────────────────────────────────────────────────────────────────
export interface FastRunResult {
  output: string;
  error: string | null;
  executionTime: number;
  timedOut: boolean;
  exitCode: number;
}

export interface TestCaseResult {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  status: 'passed' | 'failed' | 'error' | 'timeout';
  executionTime: number;
  pointsEarned: number;
  pointsAvailable: number;
  errorMessage: string | null;
}

// ── Spawn a process and pipe stdin ────────────────────────────────────────────
function spawnWithStdin(
  cmd: string,
  args: string[],
  input: string,
  cwd: string,
  timeoutMs: number
): Promise<FastRunResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);

    const proc = spawn(cmd, args, {
      cwd,
      signal: ac.signal,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        output: stdout.trim(),
        error: stderr.trim() || null,
        executionTime: Date.now() - startTime,
        timedOut: false,
        exitCode: code ?? 1,
      });
    });

    proc.on('error', (err: any) => {
      clearTimeout(timer);
      const timedOut = err.name === 'AbortError' || ac.signal.aborted;
      resolve({
        output: '',
        error: timedOut ? 'Time limit exceeded' : err.message,
        executionTime: Date.now() - startTime,
        timedOut,
        exitCode: 1,
      });
    });

    // Write input to stdin then close it
    if (input) {
      proc.stdin.write(input);
    }
    proc.stdin.end();
  });
}

// ── Compile step (returns compile error or null) ──────────────────────────────
function compile(cmd: string, args: string[], cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => resolve(code === 0 ? null : stderr.trim()));
    proc.on('error', (err) => resolve(err.message));
  });
}

// ── Normalize output for comparison ──────────────────────────────────────────
function normalize(s: string): string {
  return s.replace(/\r\n/g, '\n').split('\n').map(l => l.trimEnd()).join('\n').trim();
}

function outputsMatch(actual: string, expected: string): boolean {
  if (normalize(actual) === normalize(expected)) return true;
  // Handle [0,1] vs [0, 1] style differences
  const compact = (v: string) => v.replace(/\s+/g, '');
  const a = normalize(actual), e = normalize(expected);
  if (/^[\[(]/.test(a) && /^[\[(]/.test(e)) return compact(a) === compact(e);
  return false;
}

// ── Main FastExecutor class ───────────────────────────────────────────────────
export class FastExecutor {

  // Single run with custom stdin — used by POST /run
  async runOnce(language: Language, code: string, input: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<FastRunResult> {
    const workDir = join(TEMP_BASE, randomUUID());
    await mkdir(workDir, { recursive: true });

    try {
      return await this._execute(language, code, input, workDir, timeoutMs);
    } finally {
      rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  // Run against multiple test cases in parallel — used by POST /run-all
  async runAllTestCases(
    language: Language,
    code: string,
    testCases: Array<{ id: string; input: string; expectedOutput: string; points: number; isHidden?: boolean }>,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Promise<{
    passedTests: number;
    totalTests: number;
    score: number;
    maxScore: number;
    results: TestCaseResult[];
  }> {
    const workDir = join(TEMP_BASE, randomUUID());
    await mkdir(workDir, { recursive: true });

    try {
      // Compile once for compiled languages
      const compileError = await this._compileOnce(language, code, workDir);
      if (compileError) {
        // All test cases fail with compile error
        const results: TestCaseResult[] = testCases.map(tc => ({
          testCaseId: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          passed: false,
          status: 'error',
          executionTime: 0,
          pointsEarned: 0,
          pointsAvailable: tc.points,
          errorMessage: compileError,
        }));
        return { passedTests: 0, totalTests: testCases.length, score: 0, maxScore: testCases.reduce((s, t) => s + t.points, 0), results };
      }

      // Run all test cases in parallel
      const results = await Promise.all(
        testCases.map(tc => this._runTestCase(language, code, tc, workDir, timeoutMs))
      );

      const passedTests = results.filter(r => r.passed).length;
      const score = results.reduce((s, r) => s + r.pointsEarned, 0);
      const maxScore = testCases.reduce((s, t) => s + t.points, 0);

      return { passedTests, totalTests: testCases.length, score, maxScore, results };
    } finally {
      rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  // ── Internal: compile once for C/C++/Java ─────────────────────────────────
  private async _compileOnce(language: Language, code: string, workDir: string): Promise<string | null> {
    const lang = language.toLowerCase();

    if (lang === 'python' || lang === 'javascript') {
      // Interpreted — write source file, no compile step
      const ext = lang === 'python' ? 'py' : 'js';
      await writeFile(join(workDir, `solution.${ext}`), code);
      return null;
    }

    if (lang === 'cpp') {
      await writeFile(join(workDir, 'solution.cpp'), code);
      return compile('g++', ['-O2', '-o', 'solution', 'solution.cpp'], workDir);
    }

    if (lang === 'c') {
      await writeFile(join(workDir, 'solution.c'), code);
      return compile('gcc', ['-O2', '-o', 'solution', 'solution.c'], workDir);
    }

    if (lang === 'java') {
      await writeFile(join(workDir, 'Solution.java'), code);
      return compile('javac', ['Solution.java'], workDir);
    }

    return `Unsupported language: ${language}`;
  }

  // ── Internal: execute for a single test case (binary already compiled) ─────
  private async _runTestCase(
    language: Language,
    _code: string,
    tc: { id: string; input: string; expectedOutput: string; points: number },
    workDir: string,
    timeoutMs: number
  ): Promise<TestCaseResult> {
    const result = await this._runCompiled(language, tc.input, workDir, timeoutMs);
    const passed = !result.timedOut && result.exitCode === 0 && outputsMatch(result.output, tc.expectedOutput);

    return {
      testCaseId: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: result.output,
      passed,
      status: result.timedOut ? 'timeout' : result.exitCode !== 0 ? 'error' : passed ? 'passed' : 'failed',
      executionTime: result.executionTime,
      pointsEarned: passed ? tc.points : 0,
      pointsAvailable: tc.points,
      errorMessage: result.error,
    };
  }

  // ── Internal: run already-compiled binary / interpreted file ─────────────
  private _runCompiled(language: Language, input: string, workDir: string, timeoutMs: number): Promise<FastRunResult> {
    const lang = language.toLowerCase();

    if (lang === 'python')     return spawnWithStdin('python3', ['solution.py'],  input, workDir, timeoutMs);
    if (lang === 'javascript') return spawnWithStdin('node',    ['solution.js'],  input, workDir, timeoutMs);
    if (lang === 'java')       return spawnWithStdin('java',    ['Solution'],     input, workDir, timeoutMs);
    if (lang === 'cpp' || lang === 'c') {
      const bin = process.platform === 'win32' ? 'solution.exe' : './solution';
      return spawnWithStdin(bin, [], input, workDir, timeoutMs);
    }

    return Promise.resolve({ output: '', error: `Unsupported: ${language}`, executionTime: 0, timedOut: false, exitCode: 1 });
  }

  // ── Internal: full execute (write + compile + run) for single /run call ───
  private async _execute(language: Language, code: string, input: string, workDir: string, timeoutMs: number): Promise<FastRunResult> {
    const compileError = await this._compileOnce(language, code, workDir);
    if (compileError) {
      return { output: '', error: compileError, executionTime: 0, timedOut: false, exitCode: 1 };
    }
    return this._runCompiled(language, input, workDir, timeoutMs);
  }
}

export const fastExecutor = new FastExecutor();
