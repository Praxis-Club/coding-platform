import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { generateToken } from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler';

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    role: 'admin' | 'candidate';
  }) {
    console.debug(`[AUTH] Register attempt: email=${data.email}, role=${data.role}`);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      console.debug(`[AUTH] Register failed: email already exists`);
      throw new AppError(400, 'USER_EXISTS', 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.debug(`[AUTH] Login failed: no user found for email=${email}`);
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (!user.isActive) {
      console.debug(`[AUTH] Login failed: account disabled for email=${email}`);
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Account is disabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    console.debug(`[AUTH] Password check for ${email}: ${isValidPassword ? 'valid' : 'invalid'}`);

    if (!isValidPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return user;
  }

  async findAllCandidates() {
    return prisma.user.findMany({
      where: { role: 'candidate', isActive: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }
}
