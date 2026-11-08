import type { PdrBreakdown, PdrInput, PricingConfig } from './types';

export function money(value: number): string {
  const rounded = Math.round(value);
  return `${new Intl.NumberFormat('ru-RU').format(rounded)} ₽`;
}

export function fmtNum(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(rounded);
}

/** Smoothstep keeps the price inside the segment and flattens the slope at the knots. */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function roundPrice(value: number, step: number): number {
  if (!Number.isFinite(value)) return 0;
  if (!step || step <= 1) return Math.round(value);
  return Math.round(value / step) * step;
}

export function snapAdjust(percent: number, min: number, max: number, step: number): number {
  const safeStep = step > 0 ? step : 1;
  const clamped = Math.min(max, Math.max(min, percent));
  const steps = Math.round((clamped - min) / safeStep);
  const snapped = min + steps * safeStep;
  return Math.min(max, Math.max(min, snapped));
}

export function interpolateControlPoints(
  points: { diameterMm: number; price: number }[],
  diameterMm: number,
): { price: number; clamped: boolean } {
  const sorted = [...points].sort((a, b) => a.diameterMm - b.diameterMm);
  if (sorted.length === 0) return { price: 0, clamped: false };
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (diameterMm <= first.diameterMm) {
    return { price: first.price, clamped: diameterMm !== first.diameterMm };
  }
  if (diameterMm >= last.diameterMm) {
    return { price: last.price, clamped: diameterMm !== last.diameterMm };
  }
  let index = 0;
  while (index < sorted.length - 1 && diameterMm > sorted[index + 1].diameterMm) index += 1;
  const left = sorted[index];
  const right = sorted[index + 1];
  const span = right.diameterMm - left.diameterMm;
  const t = span === 0 ? 0 : (diameterMm - left.diameterMm) / span;
  const price = left.price + (right.price - left.price) * smoothstep(t);
  return { price, clamped: false };
}

export function equivalentDiameter(widthMm: number, heightMm: number): number {
  return Math.sqrt(Math.max(0, widthMm) * Math.max(0, heightMm));
}

function segmentIndex(stops: number[], value: number): number {
  if (stops.length < 2) return 0;
  let index = 0;
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (value >= stops[i] && value <= stops[i + 1]) return i;
    if (value > stops[i]) index = i;
  }
  return Math.min(index, stops.length - 2);
}

export function bilinearPrice(
  widths: number[],
  lengths: number[],
  grid: number[][],
  widthMm: number,
  lengthMm: number,
): { price: number; clamped: boolean } {
  if (!widths.length || !lengths.length || !grid.length) return { price: 0, clamped: false };
  const wMin = widths[0];
  const wMax = widths[widths.length - 1];
  const lMin = lengths[0];
  const lMax = lengths[lengths.length - 1];
  const w = Math.min(wMax, Math.max(wMin, widthMm));
  const l = Math.min(lMax, Math.max(lMin, lengthMm));
  const clamped = w !== widthMm || l !== lengthMm;
  const i = segmentIndex(widths, w);
  const j = segmentIndex(lengths, l);
  const i2 = Math.min(i + 1, widths.length - 1);
  const j2 = Math.min(j + 1, lengths.length - 1);
  const q11 = grid[i]?.[j] ?? 0;
  const q21 = grid[i2]?.[j] ?? q11;
  const q12 = grid[i]?.[j2] ?? q11;
  const q22 = grid[i2]?.[j2] ?? q11;
  const w0 = widths[i];
  const w1 = widths[i2];
  const l0 = lengths[j];
  const l1 = lengths[j2];
  const tx = w0 === w1 ? 0 : (w - w0) / (w1 - w0);
  const ty = l0 === l1 ? 0 : (l - l0) / (l1 - l0);
  const sx = smoothstep(tx);
  const sy = smoothstep(ty);
  const top = q11 + (q21 - q11) * sx;
  const bottom = q12 + (q22 - q12) * sx;
  return { price: top + (bottom - top) * sy, clamped };
}

function coefficientKey(input: PdrInput, group: string): string {
  switch (group) {
    case 'hail':
      return input.hailKey;
    case 'complexity':
      return input.complexityKey;
    case 'material':
      return input.materialKey;
    case 'carClass':
      return input.carClassKey;
    case 'coating':
      return input.coatingKey;
    default:
      return '';
  }
}

export function quotePdr(input: PdrInput, config: PricingConfig): PdrBreakdown {
  const qty = Math.max(1, Math.round(input.count || 1));
  const formulaLines: string[] = [];
  let equivalentDiameterMm: number | null = null;
  let areaCm2: number | null = null;
  let basePrice = 0;
  let clamped = false;

  if (input.shape === 'circle') {
    const diameter = Math.max(0, input.diameterMm ?? 0);
    equivalentDiameterMm = diameter;
    const hit = interpolateControlPoints(config.controlPoints, diameter);
    basePrice = hit.price;
    clamped = hit.clamped;
    formulaLines.push(`Круг, диаметр ${fmtNum(diameter)} мм`);
    formulaLines.push(`База по контрольным точкам: ${money(basePrice)}`);
  } else if (input.shape === 'oval') {
    const width = Math.max(0, input.widthMm ?? 0);
    const height = Math.max(0, input.heightMm ?? 0);
    const diameter = equivalentDiameter(width, height);
    equivalentDiameterMm = diameter;
    areaCm2 = (Math.PI * (width / 2) * (height / 2)) / 100;
    const hit = interpolateControlPoints(config.controlPoints, diameter);
    basePrice = hit.price;
    clamped = hit.clamped;
    formulaLines.push(`Овал ${fmtNum(width)} × ${fmtNum(height)} мм`);
    formulaLines.push(`Эквивалентный диаметр √(${fmtNum(width)} × ${fmtNum(height)}) = ${fmtNum(diameter)} мм`);
    formulaLines.push(`База по контрольным точкам: ${money(basePrice)}`);
  } else {
    const width = Math.max(0, input.widthMm ?? 0);
    const length = Math.max(0, input.lengthMm ?? 0);
    areaCm2 = (width * length) / 100;
    const hit = bilinearPrice(config.matrix.widths, config.matrix.lengths, config.matrix.prices, width, length);
    basePrice = hit.price;
    clamped = hit.clamped;
    formulaLines.push(`Полоса ${fmtNum(length)} × ${fmtNum(width)} мм, площадь ${fmtNum(areaCm2)} см²`);
    formulaLines.push(`База по матрице площади: ${money(basePrice)}`);
  }

  const groups = ['complexity', 'material', 'carClass', 'coating', 'hail'];
  const multipliers = groups.map((group) => {
    const key = coefficientKey(input, group);
    const found = config.coefficients.find((item) => item.group === group && item.key === key);
    return {
      group,
      key: key || 'missing',
      label: found?.label ?? 'Коэффициент не найден',
      multiplier: found?.multiplier ?? 1,
    };
  });

  let afterCoefficients = basePrice;
  for (const item of multipliers) {
    afterCoefficients *= item.multiplier;
    formulaLines.push(`× ${item.label} ${item.multiplier.toFixed(2)}`);
  }
  formulaLines.push(`После коэффициентов: ${money(afterCoefficients)}`);

  const adjustPercent = snapAdjust(input.adjustPercent ?? 0, config.adjustMin, config.adjustMax, config.adjustStep);
  const withAdjust = afterCoefficients * (1 + adjustPercent / 100);
  if (adjustPercent !== 0) {
    const sign = adjustPercent > 0 ? '+' : '';
    formulaLines.push(`Ползунок ${sign}${adjustPercent}%: ${money(withAdjust)}`);
  }

  const unitPrice = roundPrice(withAdjust, config.priceRoundTo);
  formulaLines.push(`Округление до ${config.priceRoundTo} ₽: ${money(unitPrice)}`);
  if (qty > 1) formulaLines.push(`Количество: ${qty}`);
  const lineTotal = unitPrice * qty;
  formulaLines.push(`Итого позиция: ${money(lineTotal)}`);
  if (clamped) formulaLines.push('Размер вне шкалы: взята крайняя цена.');

  return {
    shape: input.shape,
    equivalentDiameterMm,
    areaCm2,
    basePrice,
    multipliers,
    afterCoefficients,
    adjustPercent,
    unitPrice,
    qty,
    lineTotal,
    clamped,
    roundTo: config.priceRoundTo,
    formulaLines,
  };
}

export function travelFee(baseFee: number, perKm: number, enabled: boolean, km: number): number {
  if (!enabled) return 0;
  return Math.max(0, Math.round(baseFee)) + Math.max(0, Math.round(km)) * Math.max(0, Math.round(perKm));
}

export function pdrTitle(input: PdrInput, panel?: string | null): string {
  const place = panel && panel !== 'whole' ? panel : 'Кузов';
  if (input.shape === 'circle') {
    const count = Math.max(1, Math.round(input.count || 1));
    if (count > 1) return `${place} · ${count} × Ø ${fmtNum(input.diameterMm ?? 0)} мм`;
    return `${place} · круг Ø ${fmtNum(input.diameterMm ?? 0)} мм`;
  }
  if (input.shape === 'oval') {
    return `${place} · овал ${fmtNum(input.widthMm ?? 0)}×${fmtNum(input.heightMm ?? 0)} мм`;
  }
  return `${place} · полоса ${fmtNum(input.lengthMm ?? 0)}×${fmtNum(input.widthMm ?? 0)} мм`;
}
