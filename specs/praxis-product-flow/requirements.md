# Requirements Document

## Introduction

Phase 1 of the PRAXIS Product Flow Upgrade introduces a server-side gamification engine scoped to the practice submission path. This phase adds XP calculation, level tracking, and streak management to the existing `POST /submissions/practice` endpoint. All gamification state is stored in a new `UserProgress` Prisma model and returned alongside the existing submission result. No frontend XP display, achievements, or dashboard changes are included in Phase 1.

## Glossary

- **XP_Engine**: The pure server-side module responsible for computing XP earned from a practice submission.
- **UserProgress**: The Prisma model storing a user's cumulative XP, level, current streak, longest streak, and last active date.
- **Submissions_Service**: The existing Express service handling `POST /submissions/practice`.
- **First_Solve**: A practice submission where the user has no prior completed submission for the same question with `passedTests === totalTests`.
- **Level**: An integer (1–11+) derived from cumulative XP against the fixed threshold array `[0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500]`.
- **Streak**: The count of consecutive calendar days on which a user has made at least one practice submission.
- **Gamification_Payload**: The additional fields (`xpEarned`, `newTotalXP`, `level`, `levelUp`, `streakDays`) appended to the `POST /submissions/practice` response.

---

## Requirements

### Requirement 1: XP Calculation

**User Story:** As a developer, I want XP to be calculated from submission results using a deterministic formula, so that rewards are fair and predictable.

#### Acceptance Criteria

1. THE XP_Engine SHALL expose a pure function `computeXP(passedTests, totalTests, difficulty, isFirstSolve)` that returns a non-negative integer.
2. WHEN `difficulty` is `easy`, THE XP_Engine SHALL use a base XP value of 20.
3. WHEN `difficulty` is `medium`, THE XP_Engine SHALL use a base XP value of 50.
4. WHEN `difficulty` is `hard`, THE XP_Engine SHALL use a base XP value of 100.
5. THE XP_Engine SHALL compute earned XP as `Math.round(base * (passedTests / totalTests))`.
6. WHEN `isFirstSolve` is `true` AND `passedTests === totalTests`, THE XP_Engine SHALL add a first-solve bonus of `Math.round(base * 0.5)` to the earned XP.
7. IF `totalTests` is 0, THEN THE XP_Engine SHALL return 0.
8. THE XP_Engine SHALL be a pure function with no side effects and no database access.

---

### Requirement 2: Level Computation

**User Story:** As a developer, I want my level to reflect my cumulative XP against fixed thresholds, so that progression feels meaningful and consistent.

#### Acceptance Criteria

1. THE XP_Engine SHALL expose a pure function `getLevel(totalXP)` that returns an integer level.
2. THE XP_Engine SHALL use the threshold array `[0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500]` where index `i` maps to level `i + 1`.
3. WHEN `totalXP` is greater than or equal to a threshold at index `i`, THE XP_Engine SHALL return at least level `i + 1`.
4. WHEN `totalXP` is less than 100, THE XP_Engine SHALL return level 1.
5. WHEN `totalXP` equals or exceeds 7500, THE XP_Engine SHALL return level 11.
6. THE XP_Engine SHALL return a level that is monotonically non-decreasing as `totalXP` increases.

---

### Requirement 3: Streak Calculation

**User Story:** As a developer, I want my daily activity streak to be tracked accurately, so that I am motivated to practice consistently.

#### Acceptance Criteria

1. THE XP_Engine SHALL expose a pure function `updateStreak(lastActiveDate, currentStreak, longestStreak)` that returns `{ newStreak, newLongest, newLastActiveDate }`.
2. WHEN `lastActiveDate` is `null`, THE XP_Engine SHALL return `newStreak` of 1 and `newLongest` of at least 1.
3. WHEN the calendar day of `lastActiveDate` equals today's calendar day, THE XP_Engine SHALL return the unchanged `currentStreak` and `longestStreak` (idempotent same-day call).
4. WHEN the calendar day of `lastActiveDate` is exactly one day before today, THE XP_Engine SHALL return `newStreak` of `currentStreak + 1`.
5. WHEN the gap between `lastActiveDate` and today is greater than 1 calendar day, THE XP_Engine SHALL return `newStreak` of 1.
6. THE XP_Engine SHALL set `newLongest` to `Math.max(newStreak, longestStreak)` in all cases.
7. THE XP_Engine SHALL be a pure function with no side effects and no database access.

---

### Requirement 4: UserProgress Prisma Model

**User Story:** As a backend engineer, I want a dedicated `UserProgress` table to store each user's XP and streak state, so that gamification data is isolated from submission records.

#### Acceptance Criteria

1. THE Submissions_Service SHALL persist gamification state in a `UserProgress` model with fields: `userId` (unique), `totalXP`, `level`, `currentStreak`, `longestStreak`, `lastActiveDate`, `updatedAt`.
2. THE Submissions_Service SHALL use an upsert pattern on `userId` when writing to `UserProgress`, ensuring no duplicate rows exist per user.
3. WHEN a `UserProgress` row does not exist for a user, THE Submissions_Service SHALL create it with `totalXP = xpEarned`, `level` derived from `xpEarned`, and streak values from `updateStreak(null, 0, 0)`.
4. WHEN a `UserProgress` row already exists for a user, THE Submissions_Service SHALL increment `totalXP` by `xpEarned` and update `level`, `currentStreak`, `longestStreak`, and `lastActiveDate` accordingly.
5. THE Submissions_Service SHALL enforce a unique constraint on `userId` in the `user_progress` table.

---

### Requirement 5: First-Solve Detection

**User Story:** As a developer, I want XP bonuses to be awarded only on the first perfect solve of a problem, so that replaying problems does not inflate XP.

#### Acceptance Criteria

1. WHEN a practice submission is evaluated, THE Submissions_Service SHALL query prior submissions for the same `userId` and `questionId` with `status = 'completed'` and `passedTests = totalTests`.
2. WHEN no such prior submission exists, THE Submissions_Service SHALL pass `isFirstSolve = true` to `computeXP`.
3. WHEN at least one such prior submission exists, THE Submissions_Service SHALL pass `isFirstSolve = false` to `computeXP`.
4. THE Submissions_Service SHALL perform the first-solve query before creating the new submission record to avoid counting the current submission as a prior solve.

---

### Requirement 6: Extended Practice Submission Response

**User Story:** As a frontend developer, I want the `POST /submissions/practice` response to include gamification fields, so that the client can display XP feedback when it is ready.

#### Acceptance Criteria

1. WHEN a practice submission completes evaluation, THE Submissions_Service SHALL include `xpEarned`, `newTotalXP`, `level`, `levelUp`, and `streakDays` in the response alongside all existing fields.
2. THE Submissions_Service SHALL set `levelUp` to `true` if and only if the user's level after the XP update is strictly greater than the level before the XP update.
3. THE Submissions_Service SHALL set `streakDays` to the value of `newStreak` returned by `updateStreak`.
4. THE Submissions_Service SHALL return the existing submission result fields (`passedTests`, `totalTests`, `score`, `maxScore`, `submissionResults`) unchanged.

---

### Requirement 7: Non-Blocking Gamification

**User Story:** As a developer, I want the submission result to be unaffected by gamification failures, so that a database error in XP tracking never blocks my submission result.

#### Acceptance Criteria

1. WHEN the gamification update (XP upsert or streak update) throws an error, THE Submissions_Service SHALL log the error server-side and return the submission result without gamification fields.
2. IF the `UserProgress` upsert fails, THEN THE Submissions_Service SHALL return the submission result with `xpEarned`, `newTotalXP`, `level`, `levelUp`, and `streakDays` omitted from the response.
3. THE Submissions_Service SHALL complete code execution and test evaluation before attempting any gamification database writes.
4. THE Submissions_Service SHALL treat gamification writes as non-blocking with respect to the submission result response.

---

### Requirement 8: XP Authority

**User Story:** As a system architect, I want XP to be computed and stored exclusively server-side, so that clients cannot manipulate their own progress.

#### Acceptance Criteria

1. THE Submissions_Service SHALL compute all XP values server-side using `computeXP` after verifying test execution results.
2. THE Submissions_Service SHALL derive `isFirstSolve` from the database, not from any client-supplied parameter.
3. THE Submissions_Service SHALL derive `difficulty` from the `Question` record fetched from the database, not from any client-supplied parameter.
4. THE Submissions_Service SHALL scope all `UserProgress` reads and writes to the `userId` extracted from the authenticated JWT, not from any client-supplied parameter.
