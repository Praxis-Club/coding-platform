# Implementation Tasks — Phase 1: XP & Streak Engine

## Task 1: Add UserProgress Prisma model and migration

- [x] 1.1 Add `UserProgress` model to `prisma/schema.prisma` with fields: `id`, `userId` (unique), `totalXP`, `level`, `currentStreak`, `longestStreak`, `lastActiveDate`, `updatedAt`, and a cascade-delete relation to `User`
- [x] 1.2 Add `userProgress UserProgress?` relation field to the `User` model in schema.prisma
- [x] 1.3 Run `npx prisma migrate dev --name add_user_progress` to generate and apply the migration
- [x] 1.4 Run `npx prisma generate` to regenerate the Prisma client

## Task 2: Implement XP Engine pure functions

- [x] 2.1 Create `coding-platform/backend-main/backend/src/modules/gamification/xp.engine.ts`
- [x] 2.2 Implement `computeXP(passedTests, totalTests, difficulty, isFirstSolve): number` — base map `{ easy: 20, medium: 50, hard: 100 }`, ratio formula, first-solve bonus, zero-guard for `totalTests === 0`
- [x] 2.3 Implement `getLevel(totalXP): number` — iterate `LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500]`
- [x] 2.4 Implement `updateStreak(lastActiveDate, currentStreak, longestStreak): { newStreak, newLongest, newLastActiveDate }` — handle null, same-day (idempotent), consecutive day, broken streak cases
- [x] 2.5 Export all three functions; no imports from Prisma or Express in this file

## Task 3: Extend submitPractice in SubmissionsService

- [x] 3.1 In `submissions.service.ts`, after the submission is evaluated and `finalSubmission` is written, add a `try/catch` block for gamification (non-blocking)
- [x] 3.2 Inside the try block: query prior perfect submissions for `userId + questionId` to determine `isFirstSolve` (query must run before creating the new submission record — move it to before `prisma.submission.create`)
- [x] 3.3 Call `computeXP(passedTests, totalTests, question.difficulty, isFirstSolve)` to get `xpEarned`
- [x] 3.4 Fetch or initialize current `UserProgress` for the user, then call `updateStreak` with current values
- [x] 3.5 Upsert `UserProgress` using `prisma.userProgress.upsert` on `userId`: increment `totalXP`, set `level` via `getLevel`, update streak fields and `lastActiveDate`
- [x] 3.6 Compute `levelUp = newLevel > oldLevel` using the level before and after the upsert
- [x] 3.7 Return `xpEarned`, `newTotalXP`, `level`, `levelUp`, `streakDays` appended to the existing response object
- [x] 3.8 In the catch block: log the error and return the response without gamification fields (omit them rather than returning nulls)

## Task 4: Write unit and property tests for XP Engine

- [x] 4.1 Create `coding-platform/backend-main/backend/src/modules/gamification/xp.engine.test.ts`
- [x] 4.2 Add `fast-check` as a dev dependency (`npm install --save-dev fast-check`)
- [x] 4.3 Write unit tests for `computeXP`: easy/medium/hard base values, partial pass ratio, first-solve bonus only on perfect score, zero totalTests guard
- [x] 4.4 Write property test: *for any* valid inputs, `computeXP` returns a non-negative integer (Property 1)
- [x] 4.5 Write property test: first-solve bonus equals `Math.round(base * 0.5)` added to non-bonus result for perfect submissions (Property 2)
- [x] 4.6 Write unit tests for `getLevel`: boundary values at each threshold (0, 99, 100, 249, 250, 499, 500, 7499, 7500)
- [x] 4.7 Write property test: `getLevel` is monotonically non-decreasing — for any `xp1 ≤ xp2`, `getLevel(xp1) ≤ getLevel(xp2)` (Property 3)
- [x] 4.8 Write unit tests for `updateStreak`: null lastActiveDate, same-day call, consecutive day, gap > 1 day
- [x] 4.9 Write property test: same-day call is idempotent — streak and longest unchanged (Property 4)
- [x] 4.10 Write property test: consecutive-day call increments streak by exactly 1 (Property 5)
- [x] 4.11 Write property test: gap > 1 day always resets streak to 1 (Property 6)
- [ ] 4.12 Write property test: `newLongest ≥ longestStreak` and `newLongest ≥ newStreak` for all inputs (Property 7)

## Task 5: Integration test for extended submitPractice response

- [ ] 5.1 Create `coding-platform/backend-main/backend/src/modules/submissions/submissions.practice.test.ts`
- [ ] 5.2 Write integration test: first submission for a question returns `xpEarned > 0`, `levelUp` boolean, `streakDays >= 1`, and all existing fields intact
- [ ] 5.3 Write integration test: second perfect submission for the same question returns `xpEarned` equal to base XP without first-solve bonus (Property 9)
- [ ] 5.4 Write integration test: two submissions on the same day result in exactly one `UserProgress` row (Property 8)
- [ ] 5.5 Write integration test: when gamification upsert is mocked to throw, response still contains `passedTests`, `totalTests`, `score`, `maxScore`, `submissionResults` (Property 10)
