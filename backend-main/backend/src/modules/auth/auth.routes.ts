import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validation';
import { registerSchema, loginSchema } from './auth.validation';
import { authenticate, authorize } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.get('/users', authenticate, authorize('admin'), authController.getUsers);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getProfile);

export default router;
