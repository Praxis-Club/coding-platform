import { z } from 'zod';

export const submitCodeSchema = z.object({
  body: z.object({
    userAssessmentId: z.string().uuid(),
    questionId: z.string().uuid(),
    language: z.string().min(1),
    code: z.string().min(1, 'Code cannot be empty'),
  }),
});

export const runCodeSchema = z.object({
  body: z.object({
    language: z.string().min(1),
    code: z.string().min(1, 'Code cannot be empty'),
    input: z.string().default(''),
  }),
});
