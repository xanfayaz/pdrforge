import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import type { UserRole } from '@pdrforge/shared';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

class EmployeeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(['owner', 'admin', 'master']) role?: UserRole;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

@Controller('team')
export class TeamController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.employee.findMany({
      where: { workshopId: user.workshopId },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: EmployeeDto) {
    if (!dto.name || dto.name.trim().length < 2) throw new BadRequestException('Укажите имя');
    if (!dto.phone || dto.phone.trim().length < 5) throw new BadRequestException('Укажите телефон');
    if (!dto.role) throw new BadRequestException('Укажите роль');
    return this.prisma.employee.create({
      data: {
        workshopId: user.workshopId,
        name: dto.name.trim(),
        role: dto.role,
        title: dto.title?.trim() || '',
        phone: dto.phone.trim(),
        email: dto.email?.trim() || null,
        color: dto.color || '#3c8dff',
        active: dto.active ?? true,
      },
    });
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: EmployeeDto) {
    const employee = await this.prisma.employee.findFirst({ where: { id, workshopId: user.workshopId } });
    if (!employee) throw new BadRequestException('Сотрудник не найден');
    const losesOwner = employee.role === 'owner' && ((dto.role && dto.role !== 'owner') || dto.active === false);
    if (losesOwner) {
      const owners = await this.prisma.employee.count({
        where: { workshopId: user.workshopId, role: 'owner', active: true, NOT: { id } },
      });
      if (owners < 1) throw new BadRequestException('В мастерской должен остаться хотя бы один владелец');
    }
    return this.prisma.employee.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        role: dto.role,
        title: dto.title?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email === undefined ? undefined : dto.email?.trim() || null,
        color: dto.color,
        active: dto.active,
      },
    });
  }
}
