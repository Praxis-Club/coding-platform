-- CreateTable
CREATE TABLE "user_assessment_progress" (
    "id" TEXT NOT NULL,
    "user_assessment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_assessment_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_assessment_progress_user_assessment_id_question_id_key" ON "user_assessment_progress"("user_assessment_id", "question_id");

-- CreateIndex
CREATE INDEX "questions_is_active_idx" ON "questions"("is_active");

-- AddForeignKey
ALTER TABLE "user_assessment_progress" ADD CONSTRAINT "user_assessment_progress_user_assessment_id_fkey" FOREIGN KEY ("user_assessment_id") REFERENCES "user_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
