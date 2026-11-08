import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  quotePdr,
  pdrTitle,
  snapAdjust,
  travelFee,
  type PdrInput,
  type PricingConfig,
} from '@pdrforge/shared';
import type { Workshop } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

export interface QuoteExtras {
  panelName?: string;
  armatureIds?: string[];
  travelEnabled?: boolean;
  travelKm?: number;
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  canAdjust(user: AuthUser, workshop: Pick<Workshop, 'staffCanAdjust'>) {
    return user.role === 'owner' || user.role === 'admin' || workshop.staffCanAdjust;
  }

  async load(workshopId: string) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) throw new BadRequestException('Мастерская не найдена');
    const [controlPoints, coefficients, matrix, armature] = await Promise.all([
      this.prisma.controlPoint.findMany({ where: { workshopId }, orderBy: { diameterMm: 'asc' } }),
      this.prisma.coefficient.findMany({
        where: { workshopId },
        orderBy: [{ group: 'asc' }, { sort: 'asc' }],
      }),
      this.prisma.areaMatrix.findUnique({ where: { workshopId } }),
      this.prisma.armatureItem.findMany({ where: { workshopId }, orderBy: { name: 'asc' } }),
    ]);
    if (!matrix) throw new BadRequestException('Матрица площади не настроена');
    const config: PricingConfig = {
      controlPoints: controlPoints.map((point) => ({ diameterMm: point.diameterMm, price: point.price })),
      coefficients: coefficients.map((item) => ({
        group: item.group,
        key: item.key,
        label: item.label,
        multiplier: item.multiplier,
        sort: item.sort,
      })),
      matrix: {
        widths: asNumbers(matrix.widths),
        lengths: asNumbers(matrix.lengths),
        prices: asGrid(matrix.prices),
      },
      adjustMin: workshop.adjustMin,
      adjustMax: workshop.adjustMax,
      adjustStep: workshop.adjustStep,
      priceRoundTo: workshop.priceRoundTo,
    };
    return { workshop, controlPoints, coefficients, matrix: config.matrix, armature, config };
  }

  async settings(user: AuthUser) {
    const loaded = await this.load(user.workshopId);
    return {
      controlPoints: loaded.controlPoints,
      coefficients: loaded.coefficients,
      matrix: loaded.matrix,
      armature: loaded.armature,
      policy: {
        travelBaseFee: loaded.workshop.travelBaseFee,
        travelPerKm: loaded.workshop.travelPerKm,
        adjustMin: loaded.workshop.adjustMin,
        adjustMax: loaded.workshop.adjustMax,
        adjustStep: loaded.workshop.adjustStep,
        staffCanAdjust: loaded.workshop.staffCanAdjust,
        priceRoundTo: loaded.workshop.priceRoundTo,
        minOrder: loaded.workshop.minOrder,
      },
      canAdjust: this.canAdjust(user, loaded.workshop),
    };
  }

  async quote(user: AuthUser, input: PdrInput, extras: QuoteExtras = {}) {
    const loaded = await this.load(user.workshopId);
    assertShape(input);
    assertCoefficientKeys(loaded.coefficients, input);
    const snapped = snapAdjust(input.adjustPercent ?? 0, loaded.workshop.adjustMin, loaded.workshop.adjustMax, loaded.workshop.adjustStep);
    if (!this.canAdjust(user, loaded.workshop) && snapped !== 0) {
      throw new ForbiddenException('Быстрая корректировка закрыта для мастеров. Её включает владелец в конструкторе.');
    }
    const normalized: PdrInput = { ...input, count: Math.max(1, Math.round(input.count || 1)), adjustPercent: snapped };
    const pdr = quotePdr(normalized, loaded.config);
    const ids = extras.armatureIds ?? [];
    const armature = ids.length
      ? await this.prisma.armatureItem.findMany({
          where: { workshopId: user.workshopId, id: { in: ids }, active: true },
        })
      : [];
    const fee = travelFee(
      loaded.workshop.travelBaseFee,
      loaded.workshop.travelPerKm,
      Boolean(extras.travelEnabled),
      extras.travelKm ?? 0,
    );
    const armatureTotal = armature.reduce((sum, item) => sum + item.price, 0);
    return {
      pdr,
      title: pdrTitle(normalized, extras.panelName || 'Элемент'),
      description: pdr.multipliers.map((item) => item.label).join(' · '),
      armature,
      armatureTotal,
      travelFee: fee,
      grandTotal: pdr.lineTotal + armatureTotal + fee,
    };
  }

  async replacePoints(user: AuthUser, points: { diameterMm: number; price: number }[]) {
    if (points.length < 2) throw new BadRequestException('Нужны минимум две контрольные точки');
    const seen = new Set<number>();
    const sorted = [...points].sort((a, b) => a.diameterMm - b.diameterMm);
    for (const point of sorted) {
      if (!Number.isInteger(point.diameterMm) || point.diameterMm < 1 || point.diameterMm > 2000) {
        throw new BadRequestException('Диаметр точки — целое число от 1 до 2000 мм');
      }
      if (!Number.isInteger(point.price) || point.price < 0 || point.price > 10_000_000) {
        throw new BadRequestException('Цена точки должна быть целым числом рублей');
      }
      if (seen.has(point.diameterMm)) throw new BadRequestException('Диаметры контрольных точек не должны повторяться');
      seen.add(point.diameterMm);
    }
    await this.prisma.$transaction([
      this.prisma.controlPoint.deleteMany({ where: { workshopId: user.workshopId } }),
      this.prisma.controlPoint.createMany({
        data: sorted.map((point) => ({
          workshopId: user.workshopId,
          diameterMm: point.diameterMm,
          price: point.price,
        })),
      }),
    ]);
    return this.settings(user);
  }

  async replaceCoefficients(
    user: AuthUser,
    items: { group: string; key: string; label: string; multiplier: number; sort?: number }[],
  ) {
    const groups = new Set(['hail', 'complexity', 'material', 'carClass', 'coating']);
    if (items.length < 5) throw new BadRequestException('Заполните коэффициенты всех групп');
    for (const item of items) {
      if (!groups.has(item.group)) throw new BadRequestException(`Неизвестная группа ${item.group}`);
      if (!item.key || !/^[a-z0-9-]{1,32}$/.test(item.key)) throw new BadRequestException('Ключ коэффициента: латиница и цифры');
      if (!item.label || item.label.trim().length < 2) throw new BadRequestException('Укажите название коэффициента');
      if (!(item.multiplier > 0) || item.multiplier > 10) throw new BadRequestException('Множитель должен быть больше 0 и не больше 10');
    }
    await this.prisma.$transaction([
      this.prisma.coefficient.deleteMany({ where: { workshopId: user.workshopId } }),
      this.prisma.coefficient.createMany({
        data: items.map((item, index) => ({
          workshopId: user.workshopId,
          group: item.group,
          key: item.key,
          label: item.label.trim(),
          multiplier: item.multiplier,
          sort: item.sort ?? (index + 1) * 10,
        })),
      }),
    ]);
    return this.settings(user);
  }

  async replaceMatrix(user: AuthUser, widths: number[], lengths: number[], prices: number[][]) {
    assertStops('Ширина', widths);
    assertStops('Длина', lengths);
    if (prices.length !== widths.length) throw new BadRequestException('Число строк матрицы должно совпадать с ширинами');
    for (const row of prices) {
      if (row.length !== lengths.length) throw new BadRequestException('Число столбцов матрицы должно совпадать с длинами');
      if (row.some((price) => !Number.isInteger(price) || price < 0)) {
        throw new BadRequestException('Цены матрицы — целые рубли');
      }
    }
    await this.prisma.areaMatrix.upsert({
      where: { workshopId: user.workshopId },
      update: { widths, lengths, prices },
      create: { workshopId: user.workshopId, widths, lengths, prices },
    });
    return this.settings(user);
  }

  async updatePolicy(
    user: AuthUser,
    patch: {
      travelBaseFee?: number;
      travelPerKm?: number;
      adjustMin?: number;
      adjustMax?: number;
      adjustStep?: number;
      staffCanAdjust?: boolean;
      priceRoundTo?: number;
      minOrder?: number;
    },
  ) {
    const current = await this.prisma.workshop.findUnique({ where: { id: user.workshopId } });
    if (!current) throw new BadRequestException('Мастерская не найдена');
    const next = { ...current, ...patch };
    if (![1, 10, 50, 100].includes(next.priceRoundTo)) {
      throw new BadRequestException('Округление: 1, 10, 50 или 100 ₽');
    }
    if (next.adjustMin >= next.adjustMax) throw new BadRequestException('Минимум ползунка должен быть меньше максимума');
    if (next.adjustMin < -90 || next.adjustMax > 300) throw new BadRequestException('Ползунок допустим от −90% до +300%');
    if (next.adjustStep <= 0 || next.adjustStep > 50) throw new BadRequestException('Шаг ползунка от 1 до 50');
    if (next.travelBaseFee < 0 || next.travelPerKm < 0 || next.minOrder < 0) {
      throw new BadRequestException('Стоимость не может быть отрицательной');
    }
    await this.prisma.workshop.update({
      where: { id: user.workshopId },
      data: {
        travelBaseFee: next.travelBaseFee,
        travelPerKm: next.travelPerKm,
        adjustMin: next.adjustMin,
        adjustMax: next.adjustMax,
        adjustStep: next.adjustStep,
        staffCanAdjust: next.staffCanAdjust,
        priceRoundTo: next.priceRoundTo,
        minOrder: next.minOrder,
      },
    });
    return this.settings(user);
  }

  async createArmature(user: AuthUser, data: { name: string; price: number; minutes?: number; panelCode?: string }) {
    if (!data.name.trim()) throw new BadRequestException('Укажите название работы');
    return this.prisma.armatureItem.create({
      data: {
        workshopId: user.workshopId,
        name: data.name.trim(),
        price: data.price,
        minutes: data.minutes ?? 20,
        panelCode: data.panelCode || null,
      },
    });
  }

  async updateArmature(
    user: AuthUser,
    id: string,
    data: { name?: string; price?: number; minutes?: number; panelCode?: string | null; active?: boolean },
  ) {
    const item = await this.prisma.armatureItem.findFirst({ where: { id, workshopId: user.workshopId } });
    if (!item) throw new BadRequestException('Работа не найдена');
    return this.prisma.armatureItem.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        price: data.price,
        minutes: data.minutes,
        panelCode: data.panelCode === undefined ? undefined : data.panelCode || null,
        active: data.active,
      },
    });
  }

  async deleteArmature(user: AuthUser, id: string) {
    const item = await this.prisma.armatureItem.findFirst({ where: { id, workshopId: user.workshopId } });
    if (!item) throw new BadRequestException('Работа не найдена');
    await this.prisma.armatureItem.delete({ where: { id } });
    return { ok: true };
  }
}

function asNumbers(value: unknown): number[] {
  return Array.isArray(value) ? value.map((item) => Number(item)) : [];
}

function asGrid(value: unknown): number[][] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => (Array.isArray(row) ? row.map((item) => Number(item)) : []));
}

function assertStops(label: string, values: number[]) {
  if (values.length < 2 || values.length > 8) throw new BadRequestException(`${label}: от 2 до 8 значений`);
  for (let i = 0; i < values.length; i += 1) {
    if (!Number.isInteger(values[i]) || values[i] <= 0) throw new BadRequestException(`${label}: целые миллиметры`);
    if (i > 0 && values[i] <= values[i - 1]) throw new BadRequestException(`${label}: значения должны расти`);
  }
}

function assertShape(input: PdrInput) {
  if (input.shape === 'circle' && !(input.diameterMm && input.diameterMm > 0)) {
    throw new BadRequestException('Для круга укажите диаметр');
  }
  if (input.shape === 'oval' && (!(input.widthMm && input.widthMm > 0) || !(input.heightMm && input.heightMm > 0))) {
    throw new BadRequestException('Для овала укажите ширину и высоту');
  }
  if (input.shape === 'stripe' && (!(input.widthMm && input.widthMm > 0) || !(input.lengthMm && input.lengthMm > 0))) {
    throw new BadRequestException('Для полосы укажите ширину и длину');
  }
}

function assertCoefficientKeys(
  coefficients: { group: string; key: string }[],
  input: PdrInput,
) {
  const pairs: [string, string][] = [
    ['hail', input.hailKey],
    ['complexity', input.complexityKey],
    ['material', input.materialKey],
    ['carClass', input.carClassKey],
    ['coating', input.coatingKey],
  ];
  for (const [group, key] of pairs) {
    if (!coefficients.some((item) => item.group === group && item.key === key)) {
      throw new BadRequestException(`Не найден коэффициент ${group}:${key}`);
    }
  }
}
