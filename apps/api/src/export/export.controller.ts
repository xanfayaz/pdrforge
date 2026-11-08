import { Controller, Get, Res } from '@nestjs/common';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@pdrforge/shared';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { presentOrder } from '../orders/totals';
import { PrismaService } from '../prisma/prisma.service';

@Controller('export')
export class ExportController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('clients.xlsx')
  async clients(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const clients = await this.prisma.client.findMany({
      where: { workshopId: user.workshopId },
      include: { vehicles: true, _count: { select: { orders: true } } },
      orderBy: { name: 'asc' },
    });
    const book = new ExcelJS.Workbook();
    book.creator = 'PDRForge';
    const sheet = book.addWorksheet('Клиенты');
    sheet.columns = [
      { header: 'Имя', key: 'name', width: 32 },
      { header: 'Тип', key: 'kind', width: 16 },
      { header: 'Телефон', key: 'phone', width: 20 },
      { header: 'Почта', key: 'email', width: 28 },
      { header: 'ИНН', key: 'inn', width: 18 },
      { header: 'Автомобилей', key: 'cars', width: 14 },
      { header: 'Госномера', key: 'plates', width: 36 },
      { header: 'VIN', key: 'vins', width: 42 },
      { header: 'Заявок', key: 'orders', width: 12 },
      { header: 'Заметки', key: 'notes', width: 40 },
    ];
    styleHeader(sheet);
    for (const client of clients) {
      sheet.addRow({
        name: client.name,
        kind: client.kind === 'company' ? 'Юрлицо' : 'Физлицо',
        phone: client.phone,
        email: client.email || '',
        inn: client.inn || '',
        cars: client.vehicles.length,
        plates: client.vehicles.map((vehicle) => vehicle.plate).join(', '),
        vins: client.vehicles.map((vehicle) => vehicle.vin).join(', '),
        orders: client._count.orders,
        notes: client.notes || '',
      });
    }
    await sendBook(res, book, 'pdrforge-clients.xlsx');
  }

  @Get('orders.xlsx')
  async orders(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const workshop = await this.prisma.workshop.findUniqueOrThrow({ where: { id: user.workshopId } });
    const orders = await this.prisma.order.findMany({
      where: { workshopId: user.workshopId },
      include: { client: true, vehicle: true, assignee: true, lines: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
    const book = new ExcelJS.Workbook();
    book.creator = 'PDRForge';
    const sheet = book.addWorksheet('Заявки');
    sheet.columns = [
      { header: 'Номер', key: 'number', width: 12 },
      { header: 'Статус', key: 'status', width: 14 },
      { header: 'План', key: 'when', width: 22 },
      { header: 'Клиент', key: 'client', width: 28 },
      { header: 'Телефон', key: 'phone', width: 18 },
      { header: 'Авто', key: 'car', width: 28 },
      { header: 'Госномер', key: 'plate', width: 14 },
      { header: 'VIN', key: 'vin', width: 24 },
      { header: 'Пробег', key: 'mileage', width: 12 },
      { header: 'Мастер', key: 'assignee', width: 22 },
      { header: 'Минуты', key: 'minutes', width: 10 },
      { header: 'Начислено', key: 'total', width: 14 },
      { header: 'Оплачено', key: 'paid', width: 14 },
      { header: 'Долг', key: 'debt', width: 14 },
      { header: 'Направления', key: 'directions', width: 24 },
      { header: 'Работы', key: 'works', width: 64 },
    ];
    styleHeader(sheet);
    for (const raw of orders) {
      const order = presentOrder(raw, workshop);
      sheet.addRow({
        number: order.number,
        status: ORDER_STATUS_LABEL[order.status as OrderStatus] || order.status,
        when: order.scheduledAt ? new Date(order.scheduledAt).toLocaleString('ru-RU') : '',
        client: order.client.name,
        phone: order.client.phone,
        car: `${order.vehicle.make} ${order.vehicle.model}`,
        plate: order.vehicle.plate,
        vin: order.vehicle.vin,
        mileage: order.mileageAt ?? order.vehicle.mileage,
        assignee: order.assignee?.name || '',
        minutes: order.durationMin,
        total: order.grandTotal,
        paid: order.paid,
        debt: order.debt,
        directions: [...new Set(order.lines.map((line) => line.directionCode))].join(', '),
        works: order.lines.map((line) => line.title).join('; '),
      });
    }
    await sendBook(res, book, 'pdrforge-orders.xlsx');
  }
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF12315F' } };
  header.alignment = { vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

async function sendBook(res: Response, book: ExcelJS.Workbook, filename: string) {
  const buffer = await book.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
}
