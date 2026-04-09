import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { QuestionsService } from './questions.service';

const questionsService = new QuestionsService();

export class QuestionsController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const question = await questionsService.create(req.body, req.user!.userId);
      res.status(201).json({ success: true, data: question });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, difficulty, tags } = req.query;
      const result = await questionsService.findAll({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        difficulty: difficulty as string,
        tags: tags ? (tags as string).split(',') : undefined,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const includeHidden = req.user?.role === 'admin';
      const question = await questionsService.findById(req.params.id, includeHidden);
      res.json({ success: true, data: question });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const question = await questionsService.update(req.params.id, req.body);
      res.json({ success: true, data: question });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await questionsService.delete(req.params.id);
      res.json({ success: true, message: 'Question deleted' });
    } catch (error) {
      next(error);
    }
  }
}
