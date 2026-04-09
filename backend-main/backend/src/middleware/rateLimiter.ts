import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { Request, Response, NextFunction } from 'express';

export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW,
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts' },
  },
});

// Run (temporary execution) — more lenient, no DB write
export const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many run requests, slow down' },
  },
});

// Submit (persisted to DB) — stricter
export const codeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many submissions, please wait' },
  },
});

// Validate code payload — prevent oversized submissions
const MAX_CODE_BYTES = 64 * 1024; // 64KB
const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'c'];

export const validateCodePayload = (req: Request, res: Response, next: NextFunction) => {
  const { code, language } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_PAYLOAD', message: 'code is required' } });
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    return res.status(400).json({ success: false, error: { code: 'CODE_TOO_LARGE', message: `Code exceeds ${MAX_CODE_BYTES / 1024}KB limit` } });
  }

  if (!language || !SUPPORTED_LANGUAGES.includes(language.toLowerCase())) {
    return res.status(400).json({ success: false, error: { code: 'UNSUPPORTED_LANGUAGE', message: `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` } });
  }

  next();
};
