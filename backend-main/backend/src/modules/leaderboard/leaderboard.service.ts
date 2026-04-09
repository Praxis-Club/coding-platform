import prisma from '../../config/database';
import { cache } from '../../utils/cache';

const CACHE_KEY = 'leaderboard:global';
const CACHE_TTL = 60; // 60 seconds

export class LeaderboardService {
  async getLeaderboard(limit = 50) {
    const cached = await cache.get<any[]>(CACHE_KEY);
    if (cached) return cached;

    // Aggregate best scores per user across all completed assessments
    const results = await prisma.userAssessment.findMany({
      where: { status: 'completed' },
      select: {
        userId: true,
        score: true,
        maxScore: true,
        completedAt: true,
        startedAt: true,
        assessment: { select: { title: true, passingScore: true } },
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { completedAt: 'asc' },
    });

    // Aggregate per user
    const userMap = new Map<string, {
      userId: string;
      fullName: string;
      email: string;
      totalScore: number;
      assessmentsPassed: number;
      assessmentsAttempted: number;
      avgAccuracy: number;
      fastestTime: number | null;
    }>();

    for (const r of results) {
      const passed = r.score >= r.assessment.passingScore;
      const timeTaken = r.startedAt && r.completedAt
        ? Math.floor((r.completedAt.getTime() - r.startedAt.getTime()) / 1000)
        : null;

      if (!userMap.has(r.userId)) {
        userMap.set(r.userId, {
          userId: r.userId,
          fullName: r.user.fullName,
          email: r.user.email,
          totalScore: 0,
          assessmentsPassed: 0,
          assessmentsAttempted: 0,
          avgAccuracy: 0,
          fastestTime: null,
        });
      }

      const entry = userMap.get(r.userId)!;
      entry.totalScore += r.score;
      entry.assessmentsAttempted += 1;
      if (passed) entry.assessmentsPassed += 1;
      if (timeTaken !== null) {
        entry.fastestTime = entry.fastestTime === null
          ? timeTaken
          : Math.min(entry.fastestTime, timeTaken);
      }
    }

    // Calculate accuracy and sort
    const leaderboard = Array.from(userMap.values())
      .map(u => ({
        ...u,
        avgAccuracy: u.assessmentsAttempted > 0
          ? Math.round((u.assessmentsPassed / u.assessmentsAttempted) * 100)
          : 0,
      }))
      .sort((a, b) => {
        // Primary: total score desc
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        // Secondary: pass rate desc
        if (b.avgAccuracy !== a.avgAccuracy) return b.avgAccuracy - a.avgAccuracy;
        // Tertiary: fastest time asc
        if (a.fastestTime !== null && b.fastestTime !== null) return a.fastestTime - b.fastestTime;
        return 0;
      })
      .slice(0, limit)
      .map((u, i) => ({ rank: i + 1, ...u }));

    await cache.set(CACHE_KEY, leaderboard, CACHE_TTL);
    return leaderboard;
  }
}
