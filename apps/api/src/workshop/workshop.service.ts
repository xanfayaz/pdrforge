import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

const PROFILE_FIELDS = [
  'name',
  'legalName',
  'phone',
  'email',
  'city',
  'address',
  'inn',
  'ogrn',
  'kpp',
  'vatEnabled',
  'vatRate',
  'bankName',
  'bik',
  'account',
  'corrAccount',
  'stampText',
] as const;

type ProfilePatch = Partial<Record<(typeof PROFILE_FIELDS)[number], string | number | boolean>>;

@Injectable()
export class WorkshopService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: AuthUser) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: user.workshopId },
      include: { directions: { orderBy: { sort: 'asc' } } },
    });
    if (!workshop) throw new NotFoundException('Мастерская не найдена');
    return workshop;
  }

  async update(user: AuthUser, patch: ProfilePatch) {
    const data: ProfilePatch = {};
    for (const field of PROFILE_FIELDS) {
      if (patch[field] !== undefined) data[field] = patch[field];
    }
    if (data.vatRate != null) {
      const rate = Number(data.vatRate);
      if (!Number.isInteger(rate) || rate < 0 || rate > 30) throw new BadRequestException('НДС: целое число от 0 до 30');
      data.vatRate = rate;
    }
    if (typeof data.name === 'string' && data.name.trim().length < 2) {
      throw new BadRequestException('Укажите название мастерской');
    }
    await this.prisma.workshop.update({ where: { id: user.workshopId }, data: data as Prisma.WorkshopUpdateInput });
    return this.get(user);
  }

  async setLogo(user: AuthUser, logoPath: string) {
    await this.prisma.workshop.update({ where: { id: user.workshopId }, data: { logoPath } });
    return this.get(user);
  }

  async setDirections(user: AuthUser, items: { code?: string; name: string; enabled: boolean; isCustom?: boolean }[]) {
    if (!items.length || !items.some((item) => item.enabled)) {
      throw new BadRequestException('Оставьте включённым хотя бы одно направление');
    }
    const used = new Set<string>();
    const rows = items.map((item, index) => {
      const name = item.name.trim();
      if (name.length < 2) throw new BadRequestException('Укажите название направления');
      let code = (item.code || '').trim().toLowerCase();
      if (!code) code = `custom-${Date.now().toString(36)}-${index}`;
      if (!/^[a-z0-9-]{2,40}$/.test(code)) throw new BadRequestException(`Некорректный код: ${code}`);
      if (used.has(code)) throw new BadRequestException('Коды направлений повторяются');
      used.add(code);
      return {
        workshopId: user.workshopId,
        code,
        name,
        enabled: item.enabled,
        isCustom: Boolean(item.isCustom || code.startsWith('custom-')),
        sort: (index + 1) * 10,
      };
    });
    await this.prisma.$transaction([
      this.prisma.directionSetting.deleteMany({ where: { workshopId: user.workshopId } }),
      this.prisma.directionSetting.createMany({ data: rows }),
      this.prisma.serviceItem.deleteMany({
        where: { workshopId: user.workshopId, directionCode: { notIn: rows.map((row) => row.code) } },
      }),
    ]);
    return this.get(user);
  }

  async services(user: AuthUser, directionCode?: string) {
    return this.prisma.serviceItem.findMany({
      where: { workshopId: user.workshopId, ...(directionCode ? { directionCode } : {}) },
      orderBy: [{ directionCode: 'asc' }, { name: 'asc' }],
    });
  }

  async createService(
    user: AuthUser,
    data: { directionCode: string; name: string; price: number; isComplex?: boolean; minutes?: number },
  ) {
    const direction = await this.prisma.directionSetting.findFirst({
      where: { workshopId: user.workshopId, code: data.directionCode },
    });
    if (!direction) throw new BadRequestException('Сначала включите направление');
    if (data.name.trim().length < 2) throw new BadRequestException('Укажите название услуги');
    return this.prisma.serviceItem.create({
      data: {
        workshopId: user.workshopId,
        directionCode: data.directionCode,
        name: data.name.trim(),
        price: data.price,
        isComplex: Boolean(data.isComplex),
        minutes: data.minutes ?? 60,
      },
    });
  }

  async updateService(
    user: AuthUser,
    id: string,
    data: { name?: string; price?: number; isComplex?: boolean; minutes?: number; active?: boolean },
  ) {
    const item = await this.prisma.serviceItem.findFirst({ where: { id, workshopId: user.workshopId } });
    if (!item) throw new NotFoundException('Услуга не найдена');
    return this.prisma.serviceItem.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        price: data.price,
        isComplex: data.isComplex,
        minutes: data.minutes,
        active: data.active,
      },
    });
  }

  async deleteService(user: AuthUser, id: string) {
    const item = await this.prisma.serviceItem.findFirst({ where: { id, workshopId: user.workshopId } });
    if (!item) throw new NotFoundException('Услуга не найдена');
    await this.prisma.serviceItem.delete({ where: { id } });
    return { ok: true };
  }
}
