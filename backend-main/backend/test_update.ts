import { PrismaClient } from '@prisma/client';
import { AssessmentsService } from './src/modules/assessments/assessments.service';

const prisma = new PrismaClient();
const service = new AssessmentsService();

async function main() {
  const assessment = await prisma.assessment.findFirst();
  if (!assessment) {
    console.log("No assessments found");
    return;
  }

  const question = await prisma.question.findFirst();
  
  if (!question) {
    console.log("No questions found");
    return;
  }

  console.log("Updating assessment:", assessment.id, "with question:", question.id);

  try {
    const data = {
      title: "Test Edit",
      description: "Testing",
      duration: 60,
      passingScore: 50,
      isActive: false,
      questions: [{ questionId: question.id, points: 100 }]
    };

    const res = await service.update(assessment.id, data);
    console.log("SUCCESS:", res);
  } catch (error: any) {
    console.error("ERROR NAME:", error.name);
    console.error("ERROR MESSAGE:", error.message);
    if(error.code) console.error("ERROR CODE:", error.code);
  }
}

main().finally(() => prisma.$disconnect());
