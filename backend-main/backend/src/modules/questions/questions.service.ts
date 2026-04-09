import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { cache } from '../../utils/cache';

export class QuestionsService {
  async create(data: any, userId: string) {
    const { testCases, ...questionData } = data;

    const question = await prisma.question.create({
      data: {
        ...questionData,
        createdById: userId,
        testCases: {
          create: testCases.map((tc: any, index: number) => ({
            ...tc,
            orderIndex: index + 1,
          })),
        },
      },
      include: {
        testCases: true,
      },
    });

    return question;
  }

  async findAll(filters: {
    page?: number;
    limit?: number;
    difficulty?: string;
    tags?: string[];
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    
    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          difficulty: true,
          tags: true,
          createdAt: true,
        },
      }),
      prisma.question.count({ where }),
    ]);

    return {
      data: questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, includeHidden = false) {
    const cacheKey = `question:${id}:${includeHidden ? 'admin' : 'public'}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        testCases: {
          where: includeHidden ? {} : { isHidden: false },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
    }

    await cache.set(cacheKey, question, 3600); // 1 hour
    return question;
  }

  async update(id: string, data: any) {
    // ... existing logic ...
    const updated = await prisma.$transaction(async (tx) => {
      const { testCases, ...updateData } = data;
      const q = await tx.question.update({
        where: { id },
        data: updateData,
        include: { testCases: true },
      });

      if (testCases && testCases.length > 0) {
        await tx.testCase.deleteMany({ where: { questionId: id } });
        await tx.testCase.createMany({
          data: testCases.map((tc: any, index: number) => ({
            questionId: id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden || false,
            points: tc.points || 10,
            orderIndex: index + 1,
          })),
        });
      }

      return await tx.question.findUnique({
        where: { id },
        include: { testCases: true },
      });
    });

    // Invalidate Cache
    await cache.del(`question:${id}:public`);
    await cache.del(`question:${id}:admin`);

    return updated;
  }

  async delete(id: string) {
    await prisma.question.update({
      where: { id },
      data: { isActive: false },
    });
    // Invalidate Cache
    await cache.del(`question:${id}:public`);
    await cache.del(`question:${id}:admin`);
  }
}
