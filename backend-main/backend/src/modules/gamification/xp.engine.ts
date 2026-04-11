/**
 * XP Engine — pure functions, no side effects, no DB/Express imports.
 * All gamification math lives here so it can be tested in isolation.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

const BASE_XP: Record<Difficulty, number> = { easy: 20, medium: 50, hard: 100 };

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500];

// ── computeXP ────────────────────────────────────────────────────────────────
// Returns XP earned for a practice submission.
// isFirstSolve bonus only applies on a perfect (all tests passed) submission.
export function computeXP(
  passedTests: number,
  totalTests: number,
  difficulty: Difficulty,
  isFirstSolve: boolean
): number {
  if (totalTests === 0) return 0;
  const base = BASE_XP[difficulty];
  const ratio = passedTests / totalTests;
  const earned = Math.round(base * ratio);
  const bonus = isFirstSolve && ratio === 1 ? Math.round(base * 0.5) : 0;
  return earned + bonus;
}

// ── getLevel ─────────────────────────────────────────────────────────────────
// Returns the level (1-based) for a given cumulative XP total.
// Monotonically non-decreasing: higher XP → same or higher level.
export function getLevel(totalXP: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

// ── getXPToNextLevel ─────────────────────────────────────────────────────────
export function getXPToNextLevel(totalXP: number): number {
  const level = getLevel(totalXP);
  if (level >= LEVEL_THRESHOLDS.length) return 0; // max level
  return LEVEL_THRESHOLDS[level] - totalXP;
}

// ── updateStreak ─────────────────────────────────────────────────────────────
// Pure streak calculation. Compares calendar days only (ignores time).
// Same-day call is idempotent. Consecutive day increments. Gap > 1 resets to 1.
export function updateStreak(
  lastActiveDate: Date | null,
  currentStreak: number,
  longestStreak: number
): { newStreak: number; newLongest: number; newLastActiveDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!lastActiveDate) {
    const newStreak = 1;
    return { newStreak, newLongest: Math.max(newStreak, longestStreak), newLastActiveDate: today };
  }

  const last = new Date(lastActiveDate);
  last.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - last.getTime()) / 86_400_000);

  if (diffDays === 0) {
    // Already active today — idempotent
    return { newStreak: currentStreak, newLongest: longestStreak, newLastActiveDate: last };
  }

  if (diffDays === 1) {
    // Consecutive day
    const newStreak = currentStreak + 1;
    return { newStreak, newLongest: Math.max(newStreak, longestStreak), newLastActiveDate: today };
  }

  // Streak broken
  return { newStreak: 1, newLongest: longestStreak, newLastActiveDate: today };
}
