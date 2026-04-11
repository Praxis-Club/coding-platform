import * as fc from 'fast-check';
import { computeXP, getLevel, updateStreak, LEVEL_THRESHOLDS, Difficulty } from './xp.engine';

// ── computeXP unit tests ──────────────────────────────────────────────────────

describe('computeXP', () => {
  test('returns 0 when totalTests is 0', () => {
    expect(computeXP(0, 0, 'easy', false)).toBe(0);
    expect(computeXP(0, 0, 'hard', true)).toBe(0);
  });

  test('easy: full pass no bonus = 20', () => {
    expect(computeXP(5, 5, 'easy', false)).toBe(20);
  });

  test('medium: full pass no bonus = 50', () => {
    expect(computeXP(3, 3, 'medium', false)).toBe(50);
  });

  test('hard: full pass no bonus = 100', () => {
    expect(computeXP(1, 1, 'hard', false)).toBe(100);
  });

  test('easy: first solve bonus on perfect = 30 (20 + 10)', () => {
    expect(computeXP(5, 5, 'easy', true)).toBe(30);
  });

  test('medium: first solve bonus on perfect = 75 (50 + 25)', () => {
    expect(computeXP(3, 3, 'medium', true)).toBe(75);
  });

  test('hard: first solve bonus on perfect = 150 (100 + 50)', () => {
    expect(computeXP(1, 1, 'hard', true)).toBe(150);
  });

  test('first solve bonus NOT applied on partial pass', () => {
    expect(computeXP(3, 5, 'easy', true)).toBe(Math.round(20 * 0.6));
  });

  test('partial pass: 3/5 easy = round(20 * 0.6) = 12', () => {
    expect(computeXP(3, 5, 'easy', false)).toBe(12);
  });

  test('zero passed = 0 XP', () => {
    expect(computeXP(0, 5, 'hard', false)).toBe(0);
    expect(computeXP(0, 5, 'hard', true)).toBe(0);
  });
});

// ── computeXP property tests ──────────────────────────────────────────────────

describe('computeXP properties', () => {
  // Property 1: XP is always non-negative
  test('P1: always non-negative', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 100 }),
      fc.integer({ min: 1, max: 100 }),
      fc.constantFrom<Difficulty>('easy', 'medium', 'hard'),
      fc.boolean(),
      (passed, total, diff, isFirst) => {
        const xp = computeXP(Math.min(passed, total), total, diff, isFirst);
        return xp >= 0;
      }
    ));
  });

  // Property 2: first-solve bonus is additive and bounded
  test('P2: first-solve bonus = Math.round(base * 0.5) on perfect submission', () => {
    const BASE: Record<Difficulty, number> = { easy: 20, medium: 50, hard: 100 };
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      fc.constantFrom<Difficulty>('easy', 'medium', 'hard'),
      (total, diff) => {
        const withBonus = computeXP(total, total, diff, true);
        const withoutBonus = computeXP(total, total, diff, false);
        return withBonus === withoutBonus + Math.round(BASE[diff] * 0.5);
      }
    ));
  });
});

// ── getLevel unit tests ───────────────────────────────────────────────────────

describe('getLevel', () => {
  test('0 XP = level 1', () => expect(getLevel(0)).toBe(1));
  test('99 XP = level 1', () => expect(getLevel(99)).toBe(1));
  test('100 XP = level 2', () => expect(getLevel(100)).toBe(2));
  test('249 XP = level 2', () => expect(getLevel(249)).toBe(2));
  test('250 XP = level 3', () => expect(getLevel(250)).toBe(3));
  test('499 XP = level 3', () => expect(getLevel(499)).toBe(3));
  test('500 XP = level 4', () => expect(getLevel(500)).toBe(4));
  test('7499 XP = level 10', () => expect(getLevel(7499)).toBe(10));
  test('7500 XP = level 11', () => expect(getLevel(7500)).toBe(11));
  test('99999 XP = level 11 (max)', () => expect(getLevel(99999)).toBe(11));
});

// ── getLevel property tests ───────────────────────────────────────────────────

describe('getLevel properties', () => {
  // Property 3: monotonically non-decreasing
  test('P3: level is monotonically non-decreasing', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 10000 }),
      fc.integer({ min: 0, max: 10000 }),
      (xp1, xp2) => {
        if (xp1 <= xp2) return getLevel(xp1) <= getLevel(xp2);
        return true;
      }
    ));
  });
});

// ── updateStreak unit tests ───────────────────────────────────────────────────

describe('updateStreak', () => {
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const daysAgo = (n: number) => { const d = today(); d.setDate(d.getDate() - n); return d; };

  test('null lastActiveDate starts streak at 1', () => {
    const r = updateStreak(null, 0, 0);
    expect(r.newStreak).toBe(1);
    expect(r.newLongest).toBe(1);
  });

  test('same-day call is idempotent', () => {
    const r = updateStreak(today(), 5, 7);
    expect(r.newStreak).toBe(5);
    expect(r.newLongest).toBe(7);
  });

  test('consecutive day increments streak', () => {
    const r = updateStreak(daysAgo(1), 4, 4);
    expect(r.newStreak).toBe(5);
    expect(r.newLongest).toBe(5);
  });

  test('gap > 1 day resets streak to 1', () => {
    const r = updateStreak(daysAgo(3), 10, 10);
    expect(r.newStreak).toBe(1);
    expect(r.newLongest).toBe(10); // longest preserved
  });

  test('longestStreak updated when new streak exceeds it', () => {
    const r = updateStreak(daysAgo(1), 9, 9);
    expect(r.newStreak).toBe(10);
    expect(r.newLongest).toBe(10);
  });
});

// ── updateStreak property tests ───────────────────────────────────────────────

describe('updateStreak properties', () => {
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const daysAgo = (n: number) => { const d = today(); d.setDate(d.getDate() - n); return d; };

  // Property 4: same-day is idempotent
  test('P4: same-day call leaves streak unchanged', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 365 }),
      fc.integer({ min: 1, max: 365 }),
      (streak, longest) => {
        const safeStreak = Math.min(streak, longest);
        const safeLongest = Math.max(streak, longest);
        const r = updateStreak(today(), safeStreak, safeLongest);
        return r.newStreak === safeStreak && r.newLongest === safeLongest;
      }
    ));
  });

  // Property 5: consecutive day increments by exactly 1
  test('P5: consecutive day increments streak by 1', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 365 }),
      (streak) => {
        const r = updateStreak(daysAgo(1), streak, streak);
        return r.newStreak === streak + 1;
      }
    ));
  });

  // Property 6: gap > 1 always resets to 1
  test('P6: gap > 1 day resets streak to 1', () => {
    fc.assert(fc.property(
      fc.integer({ min: 2, max: 365 }),
      fc.integer({ min: 1, max: 365 }),
      (gap, streak) => {
        const r = updateStreak(daysAgo(gap), streak, streak);
        return r.newStreak === 1;
      }
    ));
  });

  // Property 7: newLongest never decreases
  test('P7: newLongest >= longestStreak and >= newStreak always', () => {
    fc.assert(fc.property(
      fc.option(fc.integer({ min: 0, max: 365 }), { nil: null }),
      fc.integer({ min: 0, max: 365 }),
      fc.integer({ min: 0, max: 365 }),
      (daysAgoVal, streak, longest) => {
        const date = daysAgoVal === null ? null : daysAgo(daysAgoVal);
        const safeStreak = Math.min(streak, longest);
        const safeLongest = Math.max(streak, longest);
        const r = updateStreak(date, safeStreak, safeLongest);
        return r.newLongest >= safeLongest && r.newLongest >= r.newStreak;
      }
    ));
  });
});
