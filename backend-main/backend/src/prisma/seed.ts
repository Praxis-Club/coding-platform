import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { logger } from '../utils/logger';

async function main() {
  logger.info('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      fullName: 'Admin User',
      role: 'admin',
    },
  });
  logger.info('✅ Admin user created');

  // Create candidate user
  const candidatePassword = await bcrypt.hash('Candidate123!', 10);
  const candidate = await prisma.user.upsert({
    where: { email: 'candidate@example.com' },
    update: {},
    create: {
      email: 'candidate@example.com',
      passwordHash: candidatePassword,
      fullName: 'Test Candidate',
      role: 'candidate',
    },
  });
  logger.info('✅ Candidate user created');

  // Create sample question
  const question = await prisma.question.create({
    data: {
      title: 'Two Sum',
      description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
      difficulty: 'easy',
      timeLimit: 1000,
      memoryLimit: 256,
      constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
      inputFormat: 'First line: array of integers\nSecond line: target integer',
      outputFormat: 'Array of two indices',
      sampleInput: '[2,7,11,15]\n9',
      sampleOutput: '[0,1]',
      explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      tags: ['arrays', 'hash-table', 'easy'],
      createdById: admin.id,
      testCases: {
        create: [
          {
            input: '[2,7,11,15]\n9',
            expectedOutput: '[0,1]',
            isHidden: false,
            points: 25,
            orderIndex: 1,
          },
          {
            input: '[3,2,4]\n6',
            expectedOutput: '[1,2]',
            isHidden: false,
            points: 25,
            orderIndex: 2,
          },
          {
            input: '[3,3]\n6',
            expectedOutput: '[0,1]',
            isHidden: true,
            points: 25,
            orderIndex: 3,
          },
          {
            input: '[-1,-2,-3,-4,-5]\n-8',
            expectedOutput: '[2,4]',
            isHidden: true,
            points: 25,
            orderIndex: 4,
          },
        ],
      },
    },
  });
  logger.info('✅ Sample question created');

  logger.info('🎉 Database seeded successfully!');
  logger.info('\n📧 Login credentials:');
  logger.info('Admin: admin@example.com / Admin123!');
  logger.info('Candidate: candidate@example.com / Candidate123!');
}

main()
  .catch((e) => {
    logger.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
