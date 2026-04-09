import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { cache } from '../../utils/cache';

export class AssessmentsService {
  async create(data: any, userId: string) {
    const { questions, ...assessmentData } = data;

    const totalScore = questions.reduce((sum: number, q: any) => sum + q.points, 0);

    const assessment = await prisma.assessment.create({
      data: {
        ...assessmentData,
        totalScore,
        createdById: userId,
        assessmentQuestions: {
          create: questions.map((q: any, index: number) => ({
            questionId: q.questionId,
            points: q.points,
            orderIndex: index + 1,
          })),
        },
      },
      include: {
        assessmentQuestions: {
          include: { question: true },
        },
      },
    });

    return assessment;
  }

  async findAll(userId?: string, role?: string) {
    if (role === 'candidate' && userId) {
      return prisma.assessment.findMany({
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          description: true,
          duration: true,
          totalScore: true,
          isActive: true,
          userAssessments: {
            where: { userId },
            select: { status: true, score: true }
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Admins see everything (including inactive ones)
    return prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const cacheKey = `assessment:${id}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        assessmentQuestions: {
          include: {
            question: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                timeLimit: true,
                memoryLimit: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!assessment) {
      throw new AppError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment not found');
    }

    await cache.set(cacheKey, assessment, 1800); // 30 mins
    return assessment;
  }

  async update(id: string, data: any) {
    const { title, description, duration, passingScore, isActive, questions } = data;
    
    const assessment = await prisma.assessment.findUnique({ 
      where: { id },
      include: { assessmentQuestions: true }
    });

    if (!assessment) {
      throw new AppError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment not found');
    }

    const finalIsActive = isActive !== undefined ? isActive : assessment.isActive;

    // Check if questions actually changed
    let questionsChanged = false;
    if (questions) {
      const existingQIds = assessment.assessmentQuestions.map(aq => aq.questionId).sort();
      const newQIds = questions.map((q: any) => q.questionId).sort();
      
      if (existingQIds.length !== newQIds.length || !existingQIds.every((val, index) => val === newQIds[index])) {
        questionsChanged = true;
      }
    }

    if (questionsChanged && finalIsActive) {
      throw new AppError(400, 'CANNOT_EDIT_QUESTIONS_WHILE_ACTIVE', 'Cannot modify questions while the assessment is Active. Please deactivate it first.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      let currentTotalScore = assessment.totalScore || 0;

      if (questions && questionsChanged) {
        // Delete old relations first
        await tx.assessmentQuestion.deleteMany({ where: { assessmentId: id } });
        
        // Create new relations in bulk
        await tx.assessmentQuestion.createMany({
          data: questions.map((q: any, i: number) => ({
            assessmentId: id,
            questionId: q.questionId,
            points: q.points || 100,
            orderIndex: i + 1,
          }))
        });
        currentTotalScore = questions.reduce((sum: number, q: any) => sum + (q.points || 100), 0);
      }

      return await tx.assessment.update({
        where: { id },
        data: {
          title: title !== undefined ? title : assessment.title,
          description: description !== undefined ? description : assessment.description,
          duration: duration !== undefined ? duration : assessment.duration,
          passingScore: passingScore !== undefined ? passingScore : (assessment.passingScore || 0),
          isActive: finalIsActive,
          totalScore: currentTotalScore,
        },
      });
    });

    // Invalidate Cache
    await cache.del(`assessment:${id}`);

    return updated;
  }

  async assignToUsers(assessmentId: string, userIds: string[]) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { totalScore: true },
    });

    if (!assessment) {
      throw new AppError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment not found');
    }

    const userAssessments = await prisma.userAssessment.createMany({
      data: userIds.map(userId => ({
        userId,
        assessmentId,
        maxScore: assessment.totalScore,
      })),
      skipDuplicates: true,
    });

    return userAssessments;
  }

  async startAssessment(assessmentId: string, userId: string) {
    let userAssessment = await prisma.userAssessment.findUnique({
      where: {
        userId_assessmentId: { userId, assessmentId },
      },
      include: {
        assessment: {
          include: {
            assessmentQuestions: {
              include: {
                question: {
                  include: {
                    testCases: {
                      where: { isHidden: false },
                    },
                  },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!userAssessment) {
      const assessmentData = await prisma.assessment.findUnique({
        where: { id: assessmentId }
      });
      if (!assessmentData) {
        throw new AppError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment not found');
      }

      await prisma.userAssessment.create({
        data: {
          userId,
          assessmentId,
          maxScore: assessmentData.totalScore || 0,
        }
      });

      // Refetch with all nesting
      userAssessment = (await prisma.userAssessment.findUnique({
        where: { userId_assessmentId: { userId, assessmentId } },
        include: {
          assessment: {
            include: {
              assessmentQuestions: {
                include: {
                  question: {
                    include: {
                      testCases: { where: { isHidden: false } }
                    }
                  }
                },
                orderBy: { orderIndex: 'asc' }
              }
            }
          }
        }
      }))!;
    }

    if (userAssessment.status !== 'not_started') {
      // Allow re-opening an already started/completed assessment session.
      // Frontend can use this for "continue" flows.
      return userAssessment;
    }

    const updated = await prisma.userAssessment.update({
      where: { id: userAssessment.id },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
      include: {
        assessment: {
          include: {
            assessmentQuestions: {
              include: {
                question: {
                  include: {
                    testCases: {
                      where: { isHidden: false },
                    },
                  },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    return updated;
  }

  async getResults(assessmentId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        title: true,
        passingScore: true,
        totalScore: true,
      },
    });

    if (!assessment) {
      throw new AppError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment not found');
    }

    const userAssessments = await prisma.userAssessment.findMany({
      where: { assessmentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { score: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return {
      assessment,
      rows: userAssessments.map((ua) => ({
        userAssessmentId: ua.id,
        userId: ua.userId,
        candidateName: ua.user.fullName,
        candidateEmail: ua.user.email,
        status: ua.status,
        score: ua.score,
        maxScore: ua.maxScore || assessment.totalScore || 0,
        passed: ua.score >= assessment.passingScore,
        startedAt: ua.startedAt,
        completedAt: ua.completedAt,
      })),
    };
  }

  async updateTabSwitches(userAssessmentId: string, userId: string) {
    const userAssessment = await prisma.userAssessment.findUnique({
      where: { id: userAssessmentId },
    });

    if (!userAssessment || userAssessment.userId !== userId) {
      throw new AppError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment not found');
    }

    const updated = await prisma.userAssessment.update({
      where: { id: userAssessmentId },
      data: {
        tabSwitches: { increment: 1 },
      },
    });

    return updated;
  }

  async saveProgress(userAssessmentId: string, userId: string, questionId: string, code: string, language: string) {
    // Verify ownership
    const ua = await prisma.userAssessment.findUnique({
      where: { id: userAssessmentId }
    });

    if (!ua || ua.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this assessment');
    }

    return await prisma.userAssessmentProgress.upsert({
      where: {
        userAssessmentId_questionId: { userAssessmentId, questionId }
      },
      update: { code, language },
      create: { userAssessmentId, questionId, code, language }
    });
  }

  async getProgress(userAssessmentId: string, userId: string, questionId: string) {
    const ua = await prisma.userAssessment.findUnique({
      where: { id: userAssessmentId }
    });

    if (!ua || ua.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this assessment');
    }

    return await prisma.userAssessmentProgress.findUnique({
      where: {
        userAssessmentId_questionId: { userAssessmentId, questionId }
      }
    });
  }

  async getUserAssessment(userAssessmentId: string, userId: string) {
    const userAssessment = await prisma.userAssessment.findUnique({
      where: { id: userAssessmentId },
      include: {
        assessment: {
          include: {
            assessmentQuestions: {
              include: {
                question: {
                  select: {
                    id: true,
                    title: true,
                    difficulty: true,
                    timeLimit: true,
                    memoryLimit: true,
                  },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!userAssessment || userAssessment.userId !== userId) {
      throw new AppError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment session not found');
    }

    return userAssessment;
  }
}
