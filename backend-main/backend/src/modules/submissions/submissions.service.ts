import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { Language } from '../executor/languages.config';
import { fastExecutor, cacheTestCases, getCachedTestCases } from '../executor/fast.executor';
import { computeXP, getLevel, updateStreak, Difficulty } from '../gamification/xp.engine';
import { EventEmitter } from 'events';

export class SubmissionsService extends EventEmitter {
  private normalizeOutputText(value: string): string {
    return String(value ?? '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  }

  private compareOutputs(actualOutput: string, expectedOutput: string): boolean {
    const actual = this.normalizeOutputText(actualOutput);
    const expected = this.normalizeOutputText(expectedOutput);

    if (actual === expected) {
      return true;
    }

    // Accept formatting differences in list/tuple-style outputs like:
    // [0,1] vs [0, 1], or (1,2) vs (1, 2)
    const isListLike = (v: string) =>
      (v.startsWith('[') && v.endsWith(']')) || (v.startsWith('(') && v.endsWith(')'));

    if (isListLike(actual) && isListLike(expected)) {
      const compactActual = actual.replace(/\s+/g, '');
      const compactExpected = expected.replace(/\s+/g, '');
      return compactActual === compactExpected;
    }

    return false;
  }

  private normalizeBracketArrayInput(input: string): string {
    // Convert "[1,2,3]\n9" -> "1 2 3\n9" for compatibility
    return input
      .replace(/\[([^\]]+)\]/g, (_match, values) =>
        String(values)
          .split(',')
          .map((v) => v.trim())
          .join(' ')
      );
  }

  private shouldRetryWithNormalizedInput(language: Language, input: string, error?: string | null): boolean {
    if (language !== 'python') return false;
    if (!error) return false;
    if (!input.includes('[') || !input.includes(']')) return false;

    const normalizedError = error.toLowerCase();
    return (
      normalizedError.includes('invalid literal for int') ||
      normalizedError.includes('valueerror')
    );
  }

  private async executeWithInputCompatibility(language: Language, code: string, input: string) {
    const firstTry = await fastExecutor.runOnce(language, code, input);
    const result = {
      output: firstTry.output,
      error: firstTry.timedOut ? 'Time limit exceeded' : firstTry.error,
      executionTime: firstTry.executionTime,
      success: firstTry.exitCode === 0 && !firstTry.timedOut,
    };

    // Retry with normalized bracket input for Python if ValueError
    if (this.shouldRetryWithNormalizedInput(language, input, result.error)) {
      const normalizedInput = this.normalizeBracketArrayInput(input);
      if (normalizedInput !== input) {
        const retry = await fastExecutor.runOnce(language, code, normalizedInput);
        if (retry.exitCode === 0 && !retry.timedOut) {
          return { output: retry.output, error: null, executionTime: retry.executionTime, success: true };
        }
      }
    }

    return result;
  }

  async submit(data: {
    userAssessmentId: string;
    questionId: string;
    language: string;
    code: string;
  }) {
    const userAssessment = await prisma.userAssessment.findUnique({
      where: { id: data.userAssessmentId },
    });

    if (!userAssessment || userAssessment.status !== 'in_progress') {
      throw new AppError(400, 'INVALID_ASSESSMENT', 'Assessment not in progress');
    }

    const question = await prisma.question.findUnique({
      where: { id: data.questionId },
      include: { testCases: true },
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
    }

    const submission = await prisma.submission.create({
      data: {
        userAssessmentId: data.userAssessmentId,
        questionId: data.questionId,
        language: data.language,
        code: data.code,
        status: 'pending',
        totalTests: question.testCases.length,
        maxScore: question.testCases.reduce((sum, tc) => sum + tc.points, 0),
      },
    });

    this.evaluateSubmission(submission.id, question.testCases, data.language as Language, data.code);

    return submission;
  }

  private async evaluateSubmission(
    submissionId: string,
    testCases: any[],
    language: Language,
    code: string
  ) {
    try {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'running' },
      });

      // Use FastExecutor: compile-once + parallel execution
      const fastResult = await fastExecutor.runAllTestCases(
        language,
        code,
        testCases.map(tc => ({ id: tc.id, input: tc.input, expectedOutput: tc.expectedOutput, points: tc.points }))
      );

      // Emit real-time results and persist
      let totalScore = 0;
      let passedTests = 0;

      for (const r of fastResult.results) {
        if (r.passed) passedTests++;
        totalScore += r.pointsEarned;

        const emitData = {
          testCaseId: r.testCaseId,
          status: r.status,
          actualOutput: r.actualOutput,
          executionTime: r.executionTime,
          errorMessage: r.errorMessage,
          pointsEarned: r.pointsEarned,
          pointsAvailable: r.pointsAvailable,
          passed: r.passed,
        };
        this.emit(`submission:${submissionId}`, emitData);

        await prisma.submissionResult.create({
          data: {
            submissionId,
            testCaseId: r.testCaseId,
            status: r.status as any,
            actualOutput: r.actualOutput,
            executionTime: r.executionTime,
            errorMessage: r.errorMessage,
            pointsEarned: r.pointsEarned,
          },
        });
      }

      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'completed', score: totalScore, passedTests, evaluatedAt: new Date() },
      });

      await this.updateUserAssessmentScore(submissionId);
    } catch (error) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'error', errorMessage: 'Evaluation failed' },
      });
    }
  }

  private async updateUserAssessmentScore(submissionId: string) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        userAssessmentId: true,
        questionId: true,
        score: true,
      },
    });

    if (!submission) return;

    const allSubmissions = await prisma.submission.findMany({
      where: {
        userAssessmentId: submission.userAssessmentId,
        status: 'completed',
      },
      select: {
        questionId: true,
        score: true,
      },
    });

    const bestScores = new Map<string, number>();
    allSubmissions.forEach(sub => {
      const qId = sub.questionId;
      const current = bestScores.get(qId) || 0;
      if (sub.score > current) {
        bestScores.set(qId, sub.score);
      }
    });

    const totalScore = Array.from(bestScores.values()).reduce((sum, score) => sum + score, 0);

    if (!submission.userAssessmentId) return;

    await prisma.userAssessment.update({
      where: { id: submission.userAssessmentId },
      data: { score: totalScore },
    });

    await this.markAssessmentCompletedIfEligible(submission.userAssessmentId);
  }

  private async markAssessmentCompletedIfEligible(userAssessmentId: string) {
    const userAssessment = await prisma.userAssessment.findUnique({
      where: { id: userAssessmentId },
      select: {
        id: true,
        status: true,
        assessmentId: true,
      },
    });

    if (!userAssessment || userAssessment.status === 'completed') {
      return;
    }

    const [questionCount, answeredQuestions] = await Promise.all([
      prisma.assessmentQuestion.count({
        where: { assessmentId: userAssessment.assessmentId },
      }),
      prisma.submission.findMany({
        where: {
          userAssessmentId,
          status: 'completed',
        },
        distinct: ['questionId'],
        select: {
          questionId: true,
        },
      }),
    ]);

    if (questionCount > 0 && answeredQuestions.length >= questionCount) {
      await prisma.userAssessment.update({
        where: { id: userAssessmentId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }
  }

  async getSubmission(id: string, userId: string, role: string) {
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        submissionResults: {
          include: {
            testCase: true,
          },
        },
        userAssessment: true,
      },
    });

    if (!submission) {
      throw new AppError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found');
    }

    if (role !== 'admin' && submission.userAssessment?.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    if (role !== 'admin') {
      submission.submissionResults = submission.submissionResults.map(result => ({
        ...result,
        testCase: result.testCase.isHidden ? { ...result.testCase, input: '[Hidden]', expectedOutput: '[Hidden]' } : result.testCase,
      }));
    }

    return submission;
  }

  async getSubmissionHistory(userId: string) {
    // Fetch both assessment submissions and practice submissions for this user
    const submissions = await prisma.submission.findMany({
      where: {
        OR: [
          // Assessment submissions linked via userAssessment
          {
            userAssessment: {
              userId,
            },
          },
          // Practice submissions saved directly with userId
          {
            practiceUserId: userId,
          },
        ],
      },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
        userAssessment: {
          select: {
            assessmentId: true,
            assessment: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 100,
    });

    return submissions;
  }

  // Admin endpoint to see all submissions
  async getAllSubmissions() {
    const submissions = await prisma.submission.findMany({
      include: {
        question: {
          select: {
            title: true,
          },
        },
        userAssessment: {
          select: {
            user: { select: { fullName: true, email: true } },
            assessment: { select: { title: true } },
          },
        },
        practiceUser: {
          select: { fullName: true, email: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 200, // Limit for performance
    });

    return submissions.map(sub => {
      const isPractice = !!sub.practiceUserId;
      const candidateName = isPractice ? sub.practiceUser?.fullName : sub.userAssessment?.user.fullName;
      const candidateEmail = isPractice ? sub.practiceUser?.email : sub.userAssessment?.user.email;
      const assessmentTitle = isPractice ? 'Practice Mode' : sub.userAssessment?.assessment.title || 'Unknown';
      
      return {
        id: sub.id,
        candidateName: candidateName || 'Unknown User',
        candidateEmail: candidateEmail || '',
        assessmentTitle,
        questionTitle: sub.question.title,
        status: sub.status,
        score: sub.score,
        maxScore: sub.maxScore,
        passedTests: sub.passedTests,
        totalTests: sub.totalTests,
        passed: sub.score > 0 && sub.score === sub.maxScore, // Treat perfect score as "passed" for raw submissions
        submittedAt: sub.submittedAt,
        language: sub.language,
        isPractice
      };
    });
  }

  async runCode(language: string, code: string, input: string) {
    // ── TEMPORARY EXECUTION — NO DB WRITE ─────────────────────────────────
    // Fast path: spawn-based execution with stdin piping, no file I/O for input.
    const result = await fastExecutor.runOnce(language as Language, code, input);
    return {
      output: result.output,
      error: result.timedOut ? 'Time limit exceeded' : result.error,
      executionTime: result.executionTime,
      success: result.exitCode === 0 && !result.timedOut,
    };
  }

  async runAllTestCases(data: { questionId: string; language: string; code: string }) {
    // ── TEMPORARY EXECUTION — NO DB WRITE ─────────────────────────────────
    // Fast path: compile-once + parallel test case execution.
    // Test cases are cached in memory to avoid repeated DB fetches.

    // Try memory cache first
    let testCases = getCachedTestCases(data.questionId);

    if (!testCases) {
      const question = await prisma.question.findUnique({
        where: { id: data.questionId },
        include: { testCases: { orderBy: { orderIndex: 'asc' } } },
      });
      if (!question) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
      testCases = question.testCases;
      cacheTestCases(data.questionId, testCases); // populate cache
    }

    const result = await fastExecutor.runAllTestCases(
      data.language as Language,
      data.code,
      testCases.map(tc => ({ id: tc.id, input: tc.input, expectedOutput: tc.expectedOutput, points: tc.points }))
    );

    return {
      questionId: data.questionId,
      status: 'completed',
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      score: result.score,
      maxScore: result.maxScore,
      submissionResults: result.results,
    };
  }

  async submitPractice(data: { questionId: string; language: string; code: string; userId: string }) {
    const question = await prisma.question.findUnique({
      where: { id: data.questionId },
      include: { testCases: true },
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
    }

    const maxScore = question.testCases.reduce((sum, tc) => sum + tc.points, 0);

    // ── First-solve detection (must run BEFORE creating the new submission) ──
    const priorPerfect = await prisma.submission.findFirst({
      where: { practiceUserId: data.userId, questionId: data.questionId, status: 'completed' },
      select: { passedTests: true, totalTests: true },
      orderBy: { submittedAt: 'desc' },
    }).catch(() => null);

    const isFirstSolve = !(priorPerfect && priorPerfect.totalTests !== null && priorPerfect.passedTests === priorPerfect.totalTests);

    // Create practice submission record
    const submission = await prisma.submission.create({
      data: {
        questionId: data.questionId,
        language: data.language,
        code: data.code,
        status: 'pending',
        totalTests: question.testCases.length,
        maxScore,
        practiceUserId: data.userId,
      },
    });

    // Parallelize evaluation for practice submission
    const evaluationResults = await Promise.all(question.testCases.map(async (testCase) => {
      const execResult = await this.executeWithInputCompatibility(data.language as Language, data.code, testCase.input);
      const passed = execResult.success && this.compareOutputs(execResult.output, testCase.expectedOutput);
      return { testCase, execResult, passed, pointsEarned: passed ? testCase.points : 0 };
    }));

    let totalScore = 0;
    let passedTests = 0;
    const finalResults = [];

    for (const res of evaluationResults) {
      if (res.passed) passedTests += 1;
      totalScore += res.pointsEarned;

      const submissionResult = await prisma.submissionResult.create({
        data: {
          submissionId: submission.id,
          testCaseId: res.testCase.id,
          status: res.execResult.error ? 'error' : res.passed ? 'passed' : 'failed',
          actualOutput: res.execResult.output,
          executionTime: res.execResult.executionTime,
          errorMessage: res.execResult.error,
          pointsEarned: res.pointsEarned,
        },
      });

      finalResults.push({
        ...submissionResult,
        input: res.testCase.input,
        expectedOutput: res.testCase.expectedOutput,
        pointsAvailable: res.testCase.points,
      });
    }

    const finalSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: { status: 'completed', score: totalScore, passedTests, evaluatedAt: new Date() },
    });

    // ── Gamification (non-blocking) ───────────────────────────────────────────
    let gamification: {
      xpEarned: number; newTotalXP: number; level: number; levelUp: boolean; streakDays: number;
    } | undefined;

    try {
      const xpEarned = computeXP(passedTests, question.testCases.length, question.difficulty as Difficulty, isFirstSolve);

      const existing = await prisma.userProgress.findUnique({ where: { userId: data.userId } });
      const oldLevel = existing?.level ?? 1;
      const oldXP = existing?.totalXP ?? 0;
      const { newStreak, newLongest, newLastActiveDate } = updateStreak(
        existing?.lastActiveDate ?? null,
        existing?.currentStreak ?? 0,
        existing?.longestStreak ?? 0
      );

      const newTotalXP = oldXP + xpEarned;
      const newLevel = getLevel(newTotalXP);

      await prisma.userProgress.upsert({
        where: { userId: data.userId },
        create: {
          userId: data.userId,
          totalXP: xpEarned,
          level: getLevel(xpEarned),
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: newLastActiveDate,
        },
        update: {
          totalXP: newTotalXP,
          level: newLevel,
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: newLastActiveDate,
        },
      });

      gamification = {
        xpEarned,
        newTotalXP,
        level: newLevel,
        levelUp: newLevel > oldLevel,
        streakDays: newStreak,
      };
    } catch (err) {
      console.error('[XP] Gamification update failed (non-blocking):', err);
    }

    return {
      ...finalSubmission,
      questionId: question.id,
      status: 'completed',
      passedTests,
      totalTests: question.testCases.length,
      score: totalScore,
      maxScore,
      submissionResults: finalResults,
      ...(gamification ?? {}),
    };
  }
}
