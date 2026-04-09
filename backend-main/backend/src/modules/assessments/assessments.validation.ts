import { z } from 'zod';

const assessmentQuestionSchema = z.object({
  questionId: z.string().uuid(),
  points: z.number().int().positive().default(100),
});

export const createAssessmentSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().optional(),
    duration: z.number().int().positive().min(1, 'Duration must be at least 1 minute'),
    passingScore: z.number().int().min(0).default(0),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    instructions: z.string().optional(),
    allowedLanguages: z.array(z.string()).min(1, 'At least one language must be allowed'),
    questions: z.array(assessmentQuestionSchema).min(1, 'At least one question is required'),
  }),
});

export const updateAssessmentSchema = z.object({
  body: z.object({
    title: z.string().min(5).optional(),
    description: z.string().optional(),
    duration: z.number().int().positive().optional(),
    passingScore: z.number().int().min(0).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    instructions: z.string().optional(),
    allowedLanguages: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const assignAssessmentSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().uuid()).min(1, 'At least one user must be specified'),
  }),
});

export const listAssessmentsSchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    status: z.enum(['not_started', 'in_progress', 'completed', 'expired']).optional(),
  }),
});
