-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'candidate');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'running', 'completed', 'error');

-- CreateEnum
CREATE TYPE "TestCaseStatus" AS ENUM ('passed', 'failed', 'error', 'timeout');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "memory_limit" INTEGER NOT NULL,
    "constraints" TEXT,
    "input_format" TEXT,
    "output_format" TEXT,
    "sample_input" TEXT,
    "sample_output" TEXT,
    "explanation" TEXT,
    "tags" TEXT[],
    "starter_code_python" TEXT,
    "starter_code_javascript" TEXT,
    "starter_code_java" TEXT,
    "starter_code_cpp" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expected_output" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "points" INTEGER NOT NULL DEFAULT 10,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "passing_score" INTEGER NOT NULL DEFAULT 0,
    "total_score" INTEGER,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "instructions" TEXT,
    "allowed_languages" TEXT[],
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 100,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_assessments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'not_started',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "score" INTEGER NOT NULL DEFAULT 0,
    "max_score" INTEGER,
    "time_taken" INTEGER,
    "tab_switches" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "user_assessment_id" TEXT,
    "practice_user_id" TEXT,
    "question_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "execution_time" INTEGER,
    "memory_used" INTEGER,
    "score" INTEGER NOT NULL DEFAULT 0,
    "max_score" INTEGER,
    "passed_tests" INTEGER NOT NULL DEFAULT 0,
    "total_tests" INTEGER,
    "error_message" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluated_at" TIMESTAMP(3),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_results" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "test_case_id" TEXT NOT NULL,
    "status" "TestCaseStatus" NOT NULL,
    "actual_output" TEXT,
    "execution_time" INTEGER,
    "memory_used" INTEGER,
    "error_message" TEXT,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");

-- CreateIndex
CREATE INDEX "questions_created_by_idx" ON "questions"("created_by");

-- CreateIndex
CREATE INDEX "test_cases_question_id_idx" ON "test_cases"("question_id");

-- CreateIndex
CREATE INDEX "assessments_created_by_idx" ON "assessments"("created_by");

-- CreateIndex
CREATE INDEX "assessments_start_time_end_time_idx" ON "assessments"("start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_assessment_id_question_id_key" ON "assessment_questions"("assessment_id", "question_id");

-- CreateIndex
CREATE INDEX "user_assessments_user_id_idx" ON "user_assessments"("user_id");

-- CreateIndex
CREATE INDEX "user_assessments_assessment_id_idx" ON "user_assessments"("assessment_id");

-- CreateIndex
CREATE INDEX "user_assessments_status_idx" ON "user_assessments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_assessments_user_id_assessment_id_key" ON "user_assessments"("user_id", "assessment_id");

-- CreateIndex
CREATE INDEX "submissions_user_assessment_id_idx" ON "submissions"("user_assessment_id");

-- CreateIndex
CREATE INDEX "submissions_practice_user_id_idx" ON "submissions"("practice_user_id");

-- CreateIndex
CREATE INDEX "submissions_question_id_idx" ON "submissions"("question_id");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submission_results_submission_id_idx" ON "submission_results"("submission_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_assessments" ADD CONSTRAINT "user_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_assessments" ADD CONSTRAINT "user_assessments_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_assessment_id_fkey" FOREIGN KEY ("user_assessment_id") REFERENCES "user_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_practice_user_id_fkey" FOREIGN KEY ("practice_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
