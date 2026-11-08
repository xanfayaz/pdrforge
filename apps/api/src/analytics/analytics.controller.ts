import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DIRECTIONS } from '@pdrforge/shared';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { presentOrder } from '../orders/totals';
import { PrismaService } from '../prisma/prisma.service';

class ExpenseDto {
  @IsString() category!: string;
  @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() spentAt?: string;
}

const DIRECTION_NAME = new Map(DIRECTIONS.map((item) => [item.code, item.name]));

@Controller()
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('analytics')
  async analytics(@CurrentUser() user: AuthUser, @Query('from') fromRaw?: string, @Query('to') toRaw?: string) {
    const now = new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toRaw ? new Date(toRaw) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const workshop = await this.prisma.workshop.findUniqueOrThrow({ where: { id: user.workshopId } });
    const [orders, payments, expenses, masters, directions] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          workshopId: user.workshopId,
          OR: [
            { scheduledAt: { gte: from, lte: to } },
            { scheduledAt: null, createdAt: { gte: from, lte: to } },
          ],
        },
        include: { lines: true, payments: true },
      }),
      this.prisma.payment.findMany({
        where: { paidAt: { gte: from, lte: to }, order: { workshopId: user.workshopId } },
      }),
      this.prisma.expense.findMany({
        where: { workshopId: user.workshopId, spentAt: { gte: from, lte: to } },
        orderBy: { spentAt: 'desc' },
      }),
      this.prisma.employee.count({
        where: { workshopId: user.workshopId, active: true, role: { in: ['owner', 'master'] } },
      }),
      this.prisma.directionSetting.findMany({ where: { workshopId: user.workshopId } }),
    ]);
    const names = new Map(directions.map((item) => [item.code, item.name]));
    names.set('travel', 'Выезд мастера');
    const presented = orders.map((order) => presentOrder(order, workshop));
    const working = presented.filter((order) => order.status !== 'draft');
    const done = presented.filter((order) => order.status === 'done');
    const accrued = working.reduce((sum, order) => sum + order.grandTotal, 0);
    const averageCheck = done.length ? Math.round(done.reduce((sum, order) => sum + order.grandTotal, 0) / done.length) : 0;
    const collected = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const byDirectionMap = new Map<string, number>();
    for (const order of working) {
      for (const line of order.lines) {
        byDirectionMap.set(line.directionCode, (byDirectionMap.get(line.directionCode) || 0) + line.total);
      }
      if (order.travelFee > 0) byDirectionMap.set('travel', (byDirectionMap.get('travel') || 0) + order.travelFee);
    }
    const byDirection = [...byDirectionMap.entries()]
      .map(([code, amount]) => ({
        code,
        name: names.get(code) || DIRECTION_NAME.get(code) || code,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
    const daySpan = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
    const capacityMin = Math.max(1, masters) * 8 * 60 * daySpan;
    const busyMin = working.reduce((sum, order) => sum + order.durationMin, 0);
    const statusCounts = {
      draft: presented.filter((order) => order.status === 'draft').length,
      planned: presented.filter((order) => order.status === 'planned').length,
      in_progress: presented.filter((order) => order.status === 'in_progress').length,
      done: done.length,
    };
    const allOrders = await this.prisma.order.findMany({
      where: { workshopId: user.workshopId, status: { not: 'draft' } },
      include: { lines: true, payments: true },
    });
    const openDebt = allOrders
      .map((order) => presentOrder(order, workshop))
      .reduce((sum, order) => sum + order.debt, 0);
    return {
      from,
      to,
      accrued,
      collected,
      averageCheck,
      expenseTotal,
      profit: collected - expenseTotal,
      openDebt,
      load: busyMin / capacityMin,
      busyMin,
      capacityMin,
      masters,
      byDirection,
      statusCounts,
      expenses,
    };
  }

  @Get('expenses')
  expenses(@CurrentUser() user: AuthUser) {
    return this.prisma.expense.findMany({
      where: { workshopId: user.workshopId },
      orderBy: { spentAt: 'desc' },
    });
  }

  @Post('expenses')
  createExpense(@CurrentUser() user: AuthUser, @Body() dto: ExpenseDto) {
    return this.prisma.expense.create({
      data: {
        workshopId: user.workshopId,
        category: dto.category.trim(),
        amount: dto.amount,
        note: dto.note?.trim() || '',
        spentAt: dto.spentAt ? new Date(dto.spentAt) : new Date(),
      },
    });
  }

  @Delete('expenses/:id')
  async removeExpense(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, workshopId: user.workshopId } });
    if (!expense) return { ok: false };
    await this.prisma.expense.delete({ where: { id } });
    return { ok: true };
  }
}
