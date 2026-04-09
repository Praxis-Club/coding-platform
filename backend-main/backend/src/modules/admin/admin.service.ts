import prisma from '../../config/database';

export class AdminService {
  /**
   * Deletes all UserAssessment and Submission records.
   * Keeps test cases, questions, and assessments intact.
   */
  async resetAllAttempts() {
    // Cascading deletes in schema will clean up Submissions and Results
    return await prisma.userAssessment.deleteMany({});
  }

  /**
   * Deletes all candidate users and their associated attempt data.
   * Protects admin accounts from deletion.
   */
  async deleteAllCandidates() {
    // Only delete candidates to ensure the admin stays logged in
    return await prisma.user.deleteMany({
      where: { role: 'candidate' }
    });
  }

  /**
   * Deletes all Questions and Assessments, including test cases and submissions.
   */
  async deleteAllTestData() {
    // Due to schema cascades:
    // Deleting Assessment -> Deletes AssessmentQuestion, UserAssessment
    // Deleting Question -> Deletes TestCase, AssessmentQuestion, Submission
    await prisma.assessment.deleteMany({});
    return await prisma.question.deleteMany({});
  }
}
