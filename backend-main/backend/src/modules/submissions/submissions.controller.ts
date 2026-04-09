import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { SubmissionsService } from './submissions.service';

const service = new SubmissionsService();

export class SubmissionsController {
  async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const submission = await service.submit(req.body);
      res.status(201).json({ success: true, data: submission });
    } catch (error) {
      next(error);
    }
  }

  async getSubmission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const submission = await service.getSubmission(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );
      res.json({ success: true, data: submission });
    } catch (error) {
      next(error);
    }
  }

  async runCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { language, code, input } = req.body;
      const result = await service.runCode(language, code, input || '');
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async runAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { questionId, language, code } = req.body;
      const result = await service.runAllTestCases({ questionId, language, code });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const submissions = await service.getSubmissionHistory(req.user!.userId);
      res.json({ success: true, data: submissions });
    } catch (error) {
      next(error);
    }
  }

  async getAllSubmissions(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const submissions = await service.getAllSubmissions();
      res.json({ success: true, data: submissions });
    } catch (error) {
      next(error);
    }
  }

  async submitPractice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { questionId, language, code } = req.body;
      const result = await service.submitPractice({
        questionId,
        language,
        code,
        userId: req.user!.userId,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async streamResults(req: AuthRequest, res: Response) {
    const { id } = req.params;
    
    // SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onResult = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    service.on(`submission:${id}`, onResult);
    service.on(`run:${id}`, onResult); // Also for runAllTestCases if ID matches

    req.on('close', () => {
      service.removeListener(`submission:${id}`, onResult);
      service.removeListener(`run:${id}`, onResult);
      res.end();
    });
  }
}
