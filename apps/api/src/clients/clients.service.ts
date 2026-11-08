import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { presentOrder } from '../orders/totals';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, q?: string, take = 100, skip = 0) {
    const query = q?.trim();
    const where: Prisma.ClientWhereInput = {
      workshopId: user.workshopId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { inn: { contains: query, mode: 'insensitive' } },
              { vehicles: { some: { OR: [
                { plate: { contains: query, mode: 'insensitive' } },
                { vin: { contains: query, mode: 'insensitive' } },
                { make: { contains: query, mode: 'insensitive' } },
                { model: { contains: query, mode: 'insensitive' } },
              ] } } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        include: { vehicles: { orderBy: { plate: 'asc' } }, _count: { select: { orders: true } } },
        orderBy: { name: 'asc' },
        take: Math.min(take, 200),
        skip,
      }),
    ]);
    return { total, items };
  }

  async create(
    user: AuthUser,
    data: { kind: string; name: string; phone: string; email?: string; inn?: string; notes?: string },
  ) {
    if (!['person', 'company'].includes(data.kind)) throw new BadRequestException('Тип клиента: person или company');
    if (data.name.trim().length < 2) throw new BadRequestException('Укажите имя клиента');
    if (data.phone.trim().length < 5) throw new BadRequestException('Укажите телефон');
    return this.prisma.client.create({
      data: {
        workshopId: user.workshopId,
        kind: data.kind,
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        inn: data.inn?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      include: { vehicles: true },
    });
  }

  async get(user: AuthUser, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, workshopId: user.workshopId },
      include: { vehicles: { orderBy: { plate: 'asc' } } },
    });
    if (!client) throw new NotFoundException('Клиент не найден');
    return client;
  }

  async update(user: AuthUser, id: string, data: { kind?: string; name?: string; phone?: string; email?: string; inn?: string; notes?: string }) {
    await this.get(user, id);
    return this.prisma.client.update({
      where: { id },
      data: {
        kind: data.kind,
        name: data.name?.trim(),
        phone: data.phone?.trim(),
        email: data.email === undefined ? undefined : data.email?.trim() || null,
        inn: data.inn === undefined ? undefined : data.inn?.trim() || null,
        notes: data.notes === undefined ? undefined : data.notes?.trim() || null,
      },
      include: { vehicles: true },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.get(user, id);
    const orders = await this.prisma.order.count({ where: { clientId: id } });
    if (orders > 0) throw new ConflictException('У клиента есть заявки. Сначала разберите историю.');
    await this.prisma.client.delete({ where: { id } });
    return { ok: true };
  }

  async history(user: AuthUser, id: string) {
    await this.get(user, id);
    return this.ordersFor(user, { clientId: id });
  }

  async createVehicle(
    user: AuthUser,
    clientId: string,
    data: {
      make: string;
      model: string;
      year: number;
      plate: string;
      vin: string;
      mileage: number;
      carClass: string;
      color: string;
      bodyType: string;
    },
  ) {
    await this.get(user, clientId);
    this.assertVehicle(data);
    return this.prisma.vehicle.create({
      data: {
        workshopId: user.workshopId,
        clientId,
        make: data.make.trim(),
        model: data.model.trim(),
        year: data.year,
        plate: data.plate.trim().toUpperCase(),
        vin: data.vin.trim().toUpperCase(),
        mileage: data.mileage,
        carClass: data.carClass,
        color: data.color.trim(),
        bodyType: data.bodyType.trim(),
      },
    });
  }

  async getVehicle(user: AuthUser, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, workshopId: user.workshopId },
      include: { client: true },
    });
    if (!vehicle) throw new NotFoundException('Автомобиль не найден');
    return vehicle;
  }

  async updateVehicle(user: AuthUser, id: string, data: Record<string, string | number>) {
    await this.getVehicle(user, id);
    return this.prisma.vehicle.update({
      where: { id },
      data: {
        make: typeof data.make === 'string' ? data.make.trim() : undefined,
        model: typeof data.model === 'string' ? data.model.trim() : undefined,
        year: data.year != null ? Number(data.year) : undefined,
        plate: typeof data.plate === 'string' ? data.plate.trim().toUpperCase() : undefined,
        vin: typeof data.vin === 'string' ? data.vin.trim().toUpperCase() : undefined,
        mileage: data.mileage != null ? Number(data.mileage) : undefined,
        carClass: typeof data.carClass === 'string' ? data.carClass : undefined,
        color: typeof data.color === 'string' ? data.color.trim() : undefined,
        bodyType: typeof data.bodyType === 'string' ? data.bodyType.trim() : undefined,
      },
      include: { client: true },
    });
  }

  async removeVehicle(user: AuthUser, id: string) {
    await this.getVehicle(user, id);
    const orders = await this.prisma.order.count({ where: { vehicleId: id } });
    if (orders > 0) throw new ConflictException('По автомобилю есть заявки');
    await this.prisma.vehicle.delete({ where: { id } });
    return { ok: true };
  }

  async vehicleHistory(user: AuthUser, id: string) {
    await this.getVehicle(user, id);
    return this.ordersFor(user, { vehicleId: id });
  }

  private assertVehicle(data: { make: string; model: string; year: number; plate: string; vin: string; mileage: number; carClass: string }) {
    if (data.make.trim().length < 2 || data.model.trim().length < 1) throw new BadRequestException('Укажите марку и модель');
    if (!Number.isInteger(data.year) || data.year < 1950 || data.year > 2100) throw new BadRequestException('Проверьте год выпуска');
    if (data.plate.trim().length < 4) throw new BadRequestException('Укажите госномер');
    if (data.vin.trim().length < 6) throw new BadRequestException('Укажите VIN');
    if (data.mileage < 0) throw new BadRequestException('Пробег не может быть отрицательным');
  }

  private async ordersFor(user: AuthUser, where: { clientId?: string; vehicleId?: string }) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: user.workshopId } });
    if (!workshop) throw new NotFoundException('Мастерская не найдена');
    const orders = await this.prisma.order.findMany({
      where: { workshopId: user.workshopId, ...where },
      include: {
        client: true,
        vehicle: true,
        assignee: true,
        lines: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => presentOrder(order, workshop));
  }
}
