import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

export async function createTestApp() {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();

    app.use(cookieParser());

    await app.init();

    const prisma = app.get(PrismaService);

    return { app, prisma };
}

export async function cleanDatabase(prisma: PrismaService) {
    await prisma.eventLog.deleteMany();
    await prisma.identity.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.game.deleteMany();
}