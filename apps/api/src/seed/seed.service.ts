import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { seedDemo } from './demo-seed';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  private pending: Promise<boolean> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const created = await this.ensure();
    if (created) this.logger.log('Создана демо-мастерская «Северный Контур»');
  }

  ensure() {
    if (!this.pending) this.pending = seedDemo(this.prisma);
    return this.pending;
  }
}
