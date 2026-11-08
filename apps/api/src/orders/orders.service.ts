import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ORDER_STATUS_LABEL, panelName, type OrderStatus } from '@pdrforge/shared';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { PricingService } from '../constructor/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AddConstructorDto, CreateLineDto, CreateOrderDto, CreatePaymentDto, UpdateLineDto, UpdateOrderDto } from './orders.dto';
import { presentOrder } from './totals';

const detailInclude = {
  client: true,
  vehicle: true,
  assignee: true,
  lines: {
    include: { photos: { orderBy: { createdAt: 'asc' as const } } },
    orderBy: { sort: 'asc' as const },
  },
  payments: { orderBy: { paidAt: 'desc' as const } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async list(user: AuthUser, query: { status?: string; q?: string; from?: string; to?: string; take?: number; skip?: number }) {
    const take = Math.min(query.take ?? 100, 200);
    const skip = query.skip ?? 0;
    const q = query.q?.trim();
    const where: Prisma.OrderWhereInput = {
      workshopId: user.workshopId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            scheduledAt: {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: 'insensitive' } },
              { client: { name: { contains: q, mode: 'insensitive' } } },
              { client: { phone: { contains: q, mode: 'insensitive' } } },
              { vehicle: { plate: { contains: q, mode: 'insensitive' } } },
              { vehicle: { vin: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [workshop, total, rows] = await Promise.all([
      this.workshop(user.workshopId),
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          client: true,
          vehicle: true,
          assignee: true,
          lines: { select: { id: true, directionCode: true, kind: true, title: true, panelName: true, total: true, qty: true } },
          payments: true,
        },
        orderBy: [{ scheduledAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
        take,
        skip,
      }),
    ]);
    return { total, items: rows.map((order) => presentOrder(order, workshop)) };
  }

  async detail(user: AuthUser, id: string) {
    const order = await this.mustGet(user, id);
    const workshop = await this.workshop(user.workshopId);
    return presentOrder(order, workshop);
  }

  async create(user: AuthUser, dto: CreateOrderDto) {
    await this.assertParty(user, dto.clientId, dto.vehicleId);
    const number = await this.nextNumber(user.workshopId);
    const created = await this.prisma.order.create({
      data: {
        workshopId: user.workshopId,
        number,
        clientId: dto.clientId,
        vehicleId: dto.vehicleId,
        status: dto.status ?? 'draft',
      },
    });
    return this.detail(user, created.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateOrderDto) {
    const current = await this.mustGet(user, id);
    if (dto.clientId || dto.vehicleId) {
      await this.assertParty(user, dto.clientId ?? current.clientId, dto.vehicleId ?? current.vehicleId);
    }
    if (dto.assigneeId) {
      const assignee = await this.prisma.employee.findFirst({
        where: { id: dto.assigneeId, workshopId: user.workshopId, active: true },
      });
      if (!assignee) throw new BadRequestException('Мастер не найден');
    }
    let scheduledAt: Date | null | undefined;
    if (dto.scheduledAt === null) scheduledAt = null;
    else if (dto.scheduledAt) {
      const parsed = new Date(dto.scheduledAt);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Некорректная дата');
      scheduledAt = parsed;
    }
    await this.prisma.order.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        vehicleId: dto.vehicleId,
        status: dto.status,
        scheduledAt,
        durationMin: dto.durationMin,
        assigneeId: dto.assigneeId === undefined ? undefined : dto.assigneeId || null,
        notes: dto.notes,
        travelEnabled: dto.travelEnabled,
        travelKm: dto.travelKm,
        mileageAt: dto.mileageAt === undefined ? undefined : dto.mileageAt,
      },
    });
    if (dto.mileageAt && dto.mileageAt > current.vehicle.mileage) {
      await this.prisma.vehicle.update({ where: { id: current.vehicleId }, data: { mileage: dto.mileageAt } });
    }
    if (dto.status && dto.status !== current.status) {
      await this.prisma.notification.create({
        data: {
          workshopId: user.workshopId,
          type: 'order',
          title: `${current.number}: ${ORDER_STATUS_LABEL[dto.status as OrderStatus]}`,
          body: `${current.client.name} · ${current.vehicle.plate}`,
        },
      });
    }
    return this.detail(user, id);
  }

  async remove(user: AuthUser, id: string) {
    await this.mustGet(user, id);
    await this.prisma.order.delete({ where: { id } });
    return { ok: true };
  }

  async addLine(user: AuthUser, orderId: string, dto: CreateLineDto) {
    const order = await this.mustGet(user, orderId);
    const data = await this.resolveLine(user, dto);
    await this.prisma.orderLine.create({
      data: { ...data, orderId, sort: order.lines.length },
    });
    return this.detail(user, orderId);
  }

  async updateLine(user: AuthUser, orderId: string, lineId: string, dto: UpdateLineDto) {
    const order = await this.mustGet(user, orderId);
    const line = order.lines.find((item) => item.id === lineId);
    if (!line) throw new NotFoundException('Позиция не найдена');
    if (line.kind === 'pdr') {
      if (dto.unitPrice != null && !dto.pdr) {
        throw new BadRequestException('Цену PDR меняет конструктор: откройте расчёт и ползунок.');
      }
      if (dto.pdr) {
        const quote = await this.pricing.quote(user, dto.pdr, {
          panelName: dto.panelName || line.panelName || panelName(dto.panelCode || line.panelCode),
        });
        await this.prisma.orderLine.update({
          where: { id: lineId },
          data: {
            panelCode: dto.panelCode ?? line.panelCode,
            panelName: dto.panelName || panelName(dto.panelCode ?? line.panelCode),
            title: quote.title,
            description: quote.description,
            qty: quote.pdr.qty,
            unitPrice: quote.pdr.unitPrice,
            total: quote.pdr.lineTotal,
            minutes: dto.minutes ?? line.minutes,
            snapshot: { input: dto.pdr, breakdown: quote.pdr } as unknown as Prisma.InputJsonValue,
          },
        });
        return this.detail(user, orderId);
      }
    }
    const qty = dto.qty ?? line.qty;
    const unitPrice = dto.unitPrice ?? line.unitPrice;
    await this.prisma.orderLine.update({
      where: { id: lineId },
      data: {
        panelCode: dto.panelCode,
        panelName: dto.panelName,
        title: dto.title,
        description: dto.description,
        qty,
        unitPrice,
        total: qty * unitPrice,
        minutes: dto.minutes,
      },
    });
    return this.detail(user, orderId);
  }

  async removeLine(user: AuthUser, orderId: string, lineId: string) {
    const order = await this.mustGet(user, orderId);
    if (!order.lines.some((line) => line.id === lineId)) throw new NotFoundException('Позиция не найдена');
    await this.prisma.orderLine.delete({ where: { id: lineId } });
    return this.detail(user, orderId);
  }

  async addConstructor(user: AuthUser, orderId: string, dto: AddConstructorDto) {
    const order = await this.mustGet(user, orderId);
    const panelCode = dto.panelCode || 'whole';
    const name = panelName(panelCode);
    const quote = await this.pricing.quote(user, dto.pdr, { panelName: name });
    let sort = order.lines.length;
    await this.prisma.orderLine.create({
      data: {
        orderId,
        directionCode: 'pdr',
        kind: 'pdr',
        panelCode,
        panelName: name,
        title: quote.title,
        description: quote.description,
        qty: quote.pdr.qty,
        unitPrice: quote.pdr.unitPrice,
        total: quote.pdr.lineTotal,
        minutes: dto.minutes ?? Math.max(30, quote.pdr.qty * 8),
        sort,
        snapshot: { input: dto.pdr, breakdown: quote.pdr } as unknown as Prisma.InputJsonValue,
      },
    });
    for (const armatureId of dto.armatureIds ?? []) {
      const item = quote.armature.find((entry) => entry.id === armatureId) ?? (await this.prisma.armatureItem.findFirst({
        where: { id: armatureId, workshopId: user.workshopId, active: true },
      }));
      if (!item) continue;
      sort += 1;
      await this.prisma.orderLine.create({
        data: {
          orderId,
          directionCode: 'pdr',
          kind: 'armature',
          panelCode: item.panelCode,
          panelName: item.panelCode ? panelName(item.panelCode) : null,
          title: item.name,
          description: 'Разборочно-сборочные работы',
          qty: 1,
          unitPrice: item.price,
          total: item.price,
          minutes: item.minutes,
          sort,
        },
      });
    }
    if (dto.travelEnabled != null) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { travelEnabled: dto.travelEnabled, travelKm: dto.travelKm ?? 0 },
      });
    }
    return this.detail(user, orderId);
  }

  async addPayment(user: AuthUser, orderId: string, dto: CreatePaymentDto) {
    await this.mustGet(user, orderId);
    await this.prisma.payment.create({
      data: {
        orderId,
        amount: dto.amount,
        method: dto.method,
        note: dto.note ?? '',
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      },
    });
    return this.detail(user, orderId);
  }

  async removePayment(user: AuthUser, orderId: string, paymentId: string) {
    await this.mustGet(user, orderId);
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, orderId } });
    if (!payment) throw new NotFoundException('Платёж не найден');
    await this.prisma.payment.delete({ where: { id: paymentId } });
    return this.detail(user, orderId);
  }

  async addPhoto(user: AuthUser, orderId: string, lineId: string, phase: string, url: string) {
    const order = await this.mustGet(user, orderId);
    const line = order.lines.find((item) => item.id === lineId);
    if (!line) throw new NotFoundException('Позиция не найдена');
    if (phase !== 'before' && phase !== 'after') throw new BadRequestException('Фаза фото: before или after');
    const same = line.photos.filter((photo) => photo.phase === phase).length;
    if (same >= 8) throw new BadRequestException('Не больше 8 фото на фазу');
    await this.prisma.photo.create({ data: { lineId, phase, url } });
    return this.detail(user, orderId);
  }

  async removePhoto(user: AuthUser, photoId: string) {
    const photo = await this.prisma.photo.findFirst({
      where: { id: photoId, line: { order: { workshopId: user.workshopId } } },
      include: { line: true },
    });
    if (!photo) throw new NotFoundException('Фото не найдено');
    await this.prisma.photo.delete({ where: { id: photoId } });
    return this.detail(user, photo.line.orderId);
  }

  private async resolveLine(user: AuthUser, dto: CreateLineDto) {
    const panelCode = dto.panelCode || null;
    const resolvedName = dto.panelName || (panelCode ? panelName(panelCode) : null);
    if (dto.kind === 'pdr') {
      if (!dto.pdr) throw new BadRequestException('Для PDR нужен расчёт конструктора');
      const quote = await this.pricing.quote(user, dto.pdr, { panelName: resolvedName || 'Элемент' });
      return {
        directionCode: 'pdr',
        kind: 'pdr',
        panelCode,
        panelName: resolvedName,
        title: quote.title,
        description: quote.description,
        qty: quote.pdr.qty,
        unitPrice: quote.pdr.unitPrice,
        total: quote.pdr.lineTotal,
        minutes: dto.minutes ?? Math.max(30, quote.pdr.qty * 8),
        snapshot: { input: dto.pdr, breakdown: quote.pdr } as unknown as Prisma.InputJsonValue,
      };
    }

    let title = dto.title?.trim() || '';
    let unitPrice = dto.unitPrice ?? 0;
    let minutes = dto.minutes ?? 0;
    let kind = dto.kind;
    let directionCode = dto.directionCode;
    let description = dto.description ?? '';

    if (dto.armatureId) {
      const item = await this.prisma.armatureItem.findFirst({
        where: { id: dto.armatureId, workshopId: user.workshopId },
      });
      if (!item) throw new NotFoundException('Арматурная работа не найдена');
      title = title || item.name;
      if (dto.unitPrice == null) unitPrice = item.price;
      minutes = minutes || item.minutes;
      kind = 'armature';
      directionCode = directionCode || 'pdr';
      description = description || 'Разборочно-сборочные работы';
    } else if (dto.serviceId) {
      const service = await this.prisma.serviceItem.findFirst({
        where: { id: dto.serviceId, workshopId: user.workshopId, active: true },
      });
      if (!service) throw new NotFoundException('Услуга не найдена');
      title = title || service.name;
      if (dto.unitPrice == null) unitPrice = service.price;
      minutes = minutes || service.minutes;
      kind = service.isComplex ? 'complex' : 'service';
      directionCode = service.directionCode;
    }

    if (title.length < 2) throw new BadRequestException('Укажите название работы');
    const qty = dto.qty ?? 1;
    return {
      directionCode,
      kind,
      panelCode,
      panelName: resolvedName,
      title,
      description,
      qty,
      unitPrice,
      total: unitPrice * qty,
      minutes,
      snapshot: undefined,
    };
  }

  private async assertParty(user: AuthUser, clientId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, workshopId: user.workshopId },
    });
    if (!vehicle || vehicle.clientId !== clientId) {
      throw new BadRequestException('Автомобиль не принадлежит выбранному клиенту');
    }
  }

  private async workshop(workshopId: string) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) throw new NotFoundException('Мастерская не найдена');
    return workshop;
  }

  private async mustGet(user: AuthUser, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, workshopId: user.workshopId },
      include: detailInclude,
    });
    if (!order) throw new NotFoundException('Заявка не найдена');
    return order;
  }

  private async nextNumber(workshopId: string) {
    const last = await this.prisma.order.findFirst({
      where: { workshopId },
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    });
    const match = last?.number.match(/(\d+)$/);
    let value = match ? Number(match[1]) + 1 : 1001;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const number = `ПФ-${value}`;
      const exists = await this.prisma.order.findFirst({ where: { workshopId, number }, select: { id: true } });
      if (!exists) return number;
      value += 1;
    }
    return `ПФ-${value}`;
  }
}
