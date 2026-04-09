import { z } from 'zod';

export const createQuestionSchema = z.object({
  body: z.object({
    title: z.string().min(5),
    description: z.string().min(10),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    timeLimit: z.number().min(100).max(30000),
    memoryLimit: z.number().min(64).max(1024),
    constraints: z.string().optional(),
    inputFormat: z.string().optional(),
    outputFormat: z.string().optional(),
    sampleInput: z.string().optional(),
    sampleOutput: z.string().optional(),
    explanation: z.string().optional(),
    tags: z.array(z.string()).default([]),
    starterCodePython: z.string().optional(),
    starterCodeJavascript: z.string().optional(),
    starterCodeJava: z.string().optional(),
    starterCodeCpp: z.string().optional(),
    starterCodeC: z.string().optional(),
    testCases: z.array(z.object({
      input: z.string(),
      expectedOutput: z.string(),
      isHidden: z.boolean().default(false),
      points: z.number().default(10),
    })).min(1),
  }),
});

export const updateQuestionSchema = z.object({
  body: z.object({
    title: z.string().min(5).optional(),
    description: z.string().min(10).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    timeLimit: z.number().min(100).max(30000).optional(),
    memoryLimit: z.number().min(64).max(1024).optional(),
    constraints: z.string().optional(),
    inputFormat: z.string().optional(),
    outputFormat: z.string().optional(),
    sampleInput: z.string().optional(),
    sampleOutput: z.string().optional(),
    explanation: z.string().optional(),
    tags: z.array(z.string()).optional(),
    starterCodePython: z.string().optional(),
    starterCodeJavascript: z.string().optional(),
    starterCodeJava: z.string().optional(),
    starterCodeCpp: z.string().optional(),
    starterCodeC: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});
