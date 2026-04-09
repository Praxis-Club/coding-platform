import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const data = {
    email: 'test' + Date.now() + '@example.com',
    password: 'password123',
    fullName: 'Test User',
    role: 'candidate' as const,
  };

  try {
    await prisma.$connect();
    console.log('✅ Connection successful');
    
    const passwordHash = await bcrypt.hash(data.password, 10);
    
    console.log('Creating user with data:', { ...data, passwordHash: '***' });
    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
      },
    });
    
    console.log('✅ User created:', user.id);
    
    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ User cleaned up');
  } catch (e: any) {
    console.error('❌ Operation failed');
    console.error('Error Name:', e.name);
    console.error('Error Code:', e.code);
    console.error('Error Message:', e.message);
    if (e.meta) console.error('Error Meta:', e.meta);
  } finally {
    await prisma.$disconnect();
  }
}

main();
