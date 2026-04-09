import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-12345';

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) {
    console.log("No admin found!");
    return;
  }
  
  const token = jwt.sign(
    { userId: admin.id, email: admin.email, role: admin.role },
    secret,
    { expiresIn: '1d' }
  );

  const assId = '7363512e-5845-4ee1-9fc7-377481c6d918';

  console.log("Found admin token, making PUT request...");
  const res = await fetch(`https://coding-platform-production-7552.up.railway.app/api/v1/assessments/${assId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: "Test Edit Over API",
      description: "Testing API",
      duration: 60,
      passingScore: 50,
      isActive: false,
      questions: []
    })
  });

  const body = await res.text();
  console.log("STATUS:", res.status);
  console.log("BODY:", body);
}

main().finally(() => prisma.$disconnect());
