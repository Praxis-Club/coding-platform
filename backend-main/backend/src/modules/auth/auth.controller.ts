import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { AuthService } from './auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await authService.getProfile(userId);
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response) {
    // In a more advanced implementation, you would invalidate the token here
    // For now, client-side token removal is sufficient
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await authService.findAllCandidates();
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }
}
