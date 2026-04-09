import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import questionsRoutes from './modules/questions/questions.routes';
import assessmentsRoutes from './modules/assessments/assessments.routes';
import submissionsRoutes from './modules/submissions/submissions.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
    const isAllowed = allowedOrigins.includes(origin) || 
                     origin.endsWith('.vercel.app') || 
                     origin.includes('localhost');
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Logging
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/questions', questionsRoutes);
app.use('/api/v1/assessments', assessmentsRoutes);
app.use('/api/v1/submissions', submissionsRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

export default app;
