import { Router } from 'express';
import { SubmissionsController } from './submissions.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { codeLimiter, runLimiter, validateCodePayload } from '../../middleware/rateLimiter';

const router = Router();
const controller = new SubmissionsController();

router.use(authenticate);

// Admin only
router.get('/all', authorize('admin'), controller.getAllSubmissions);

// ── RUN (no DB write) ──────────────────────────────────────────────────────
router.post('/run',     runLimiter, validateCodePayload, controller.runCode);
router.post('/run-all', runLimiter, validateCodePayload, controller.runAll);

// ── SUBMIT (persisted to DB) ───────────────────────────────────────────────
router.post('/',         codeLimiter, validateCodePayload, controller.submit);
router.post('/practice', codeLimiter, validateCodePayload, controller.submitPractice);

// ── History & streaming ────────────────────────────────────────────────────
router.get('/history',    controller.getHistory);
router.get('/:id',        controller.getSubmission);
router.get('/stream/:id', controller.streamResults);

export default router;
