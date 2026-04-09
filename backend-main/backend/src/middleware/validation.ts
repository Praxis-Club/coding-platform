import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: firstError.message,
            details: error.errors,
          },
        });
      }
      return next(error);
    }
  };
};
