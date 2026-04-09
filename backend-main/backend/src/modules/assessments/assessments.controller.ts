import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { AssessmentsService } from './assessments.service';

const service = new AssessmentsService();

export class AssessmentsController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assessment = await service.create(req.body, req.user!.userId);
      res.status(201).json({ success: true, data: assessment });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assessments = await service.findAll(req.user!.userId, req.user!.role);
      res.json({ success: true, data: assessments });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assessment = await service.findById(req.params.id);
      res.json({ success: true, data: assessment });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const updated = await service.update(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async getResults(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const results = await service.getResults(req.params.id);
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }

  async assign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await service.assignToUsers(req.params.id, req.body.userIds);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async start(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await service.startAssessment(req.params.id, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTabSwitches(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await service.updateTabSwitches(req.params.id, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async logFullscreenExit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await service.logFullscreenExit(req.params.id, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async saveProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userAssessmentId, questionId, code, language } = req.body;
      const result = await service.saveProgress(userAssessmentId, req.user!.userId, questionId, code, language);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userAssessmentId, questionId } = req.query;
      const result = await service.getProgress(userAssessmentId as string, req.user!.userId, questionId as string);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getUserAssessment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await service.getUserAssessment(req.params.id, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
