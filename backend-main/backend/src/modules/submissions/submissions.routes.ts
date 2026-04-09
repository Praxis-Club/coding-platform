import { Router } from 'express';
import { SubmissionsController } from './submissions.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { codeLimiter } from '../../middleware/rateLimiter';

const router = Router();
const controller = new SubmissionsController();

router.use(authenticate);

// Admin only routes
router.get('/all', authorize('admin'), controller.getAllSubmissions);

router.post('/', codeLimiter, controller.submit);
router.post('/run', codeLimiter, controller.runCode);
router.post('/run-all', codeLimiter, controller.runAll);
router.post('/practice', codeLimiter, controller.submitPractice);
router.get('/history', controller.getHistory);
router.get('/:id', controller.getSubmission);
router.get('/stream/:id', controller.streamResults);

export default router;
