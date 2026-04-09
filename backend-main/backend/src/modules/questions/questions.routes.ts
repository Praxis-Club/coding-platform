import { Router } from 'express';
import { QuestionsController } from './questions.controller';
import { validate } from '../../middleware/validation';
import { createQuestionSchema, updateQuestionSchema } from './questions.validation';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const controller = new QuestionsController();

router.use(authenticate);

router.post('/', authorize('admin'), validate(createQuestionSchema), controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', authorize('admin'), validate(updateQuestionSchema), controller.update);
router.delete('/:id', authorize('admin'), controller.delete);

export default router;
