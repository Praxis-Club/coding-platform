import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { LeaderboardService } from './leaderboard.service';

const router = Router();
const service = new LeaderboardService();

// GET /api/v1/leaderboard
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const data = await service.getLeaderboard(limit);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
