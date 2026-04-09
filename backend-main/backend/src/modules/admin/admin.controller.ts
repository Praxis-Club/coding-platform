import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';

const adminService = new AdminService();

export class AdminController {
  async resetAllAttempts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.resetAllAttempts();
      res.json({
        success: true,
        message: 'All test attempts and question submissions have been reset.',
        count: result.count,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAllCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.deleteAllCandidates();
      res.json({
        success: true,
        message: 'All student accounts and their associated history have been removed.',
        count: result.count,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAllTestData(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.deleteAllTestData();
      res.json({
        success: true,
        message: 'All assessments, questions, and test cases have been permanently removed.',
        count: result.count,
      });
    } catch (error) {
      next(error);
    }
  }
}
