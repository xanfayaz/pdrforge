import { PrismaClient } from '@prisma/client';
import { seedDemo } from '../src/seed/demo-seed';

const prisma = new PrismaClient();

seedDemo(prisma)
  .then((created) => {
    console.log(created ? 'Демо-данные созданы' : 'Демо-данные уже есть, повторно не записываю');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
