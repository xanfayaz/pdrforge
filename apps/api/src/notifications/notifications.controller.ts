import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const items = await this.prisma.notification.findMany({
      where: { workshopId: user.workshopId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items, unread: items.filter((item) => !item.read).length };
  }

  @Post('read-all')
  async readAll(@CurrentUser() user: AuthUser) {
    await this.prisma.notification.updateMany({
      where: { workshopId: user.workshopId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }

  @Post(':id/read')
  async read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.notification.updateMany({
      where: { id, workshopId: user.workshopId },
      data: { read: true },
    });
    return { ok: true };
  }
}
