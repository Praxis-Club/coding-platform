import { Router } from 'express';
import { AssessmentsController } from './assessments.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const controller = new AssessmentsController();

router.use(authenticate);

router.post('/', authorize('admin'), controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/:id/results', authorize('admin'), controller.getResults);
router.put('/:id', authorize('admin'), controller.update);
router.post('/:id/assign', authorize('admin'), controller.assign);
router.post('/:id/start', controller.start);
router.get('/session/:id', controller.getUserAssessment);
router.patch('/:id/tab-switch', controller.updateTabSwitches);
router.post('/progress/save', controller.saveProgress);
router.get('/progress/get', controller.getProgress);

export default router;
