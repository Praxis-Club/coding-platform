import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const controller = new AdminController();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

router.post('/reset-attempts', controller.resetAllAttempts);
router.post('/delete-students', controller.deleteAllCandidates);
router.post('/delete-tests', controller.deleteAllTestData);

export default router;
