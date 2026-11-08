import type { AreaMatrix, Coefficient, ControlPoint } from './types';

export interface DirectionDefault {
  code: string;
  name: string;
  sort: number;
}

export const DIRECTIONS: DirectionDefault[] = [
  { code: 'pdr', name: 'PDR — удаление вмятин', sort: 10 },
  { code: 'body', name: 'Кузовной ремонт', sort: 20 },
  { code: 'paint', name: 'Малярные работы', sort: 30 },
  { code: 'polish', name: 'Полировка и ЛКП', sort: 40 },
  { code: 'film', name: 'Оклейка плёнками', sort: 50 },
  { code: 'tint', name: 'Тонировка', sort: 60 },
  { code: 'glass', name: 'Автостекло', sort: 70 },
  { code: 'optics', name: 'Оптика', sort: 80 },
  { code: 'detail', name: 'Детейлинг', sort: 90 },
];

export const CONTROL_POINTS: ControlPoint[] = [
  { diameterMm: 5, price: 700 },
  { diameterMm: 10, price: 1000 },
  { diameterMm: 15, price: 1400 },
  { diameterMm: 20, price: 1800 },
  { diameterMm: 30, price: 2600 },
  { diameterMm: 40, price: 3400 },
  { diameterMm: 60, price: 4800 },
  { diameterMm: 80, price: 6200 },
  { diameterMm: 100, price: 7800 },
  { diameterMm: 150, price: 11000 },
  { diameterMm: 200, price: 14500 },
  { diameterMm: 300, price: 20000 },
];

export const COEFFICIENTS: Coefficient[] = [
  { group: 'hail', key: 'none', label: 'Без града', multiplier: 1, sort: 10 },
  { group: 'hail', key: 'rare', label: 'Редкие точки', multiplier: 1.05, sort: 20 },
  { group: 'hail', key: 'medium', label: 'Средний град', multiplier: 1.2, sort: 30 },
  { group: 'hail', key: 'dense', label: 'Плотный град', multiplier: 1.4, sort: 40 },
  { group: 'complexity', key: 'easy', label: 'Лёгкий доступ', multiplier: 0.85, sort: 10 },
  { group: 'complexity', key: 'standard', label: 'Стандартный доступ', multiplier: 1, sort: 20 },
  { group: 'complexity', key: 'hard', label: 'Затруднённый доступ', multiplier: 1.3, sort: 30 },
  { group: 'complexity', key: 'double', label: 'Двойной металл', multiplier: 1.55, sort: 40 },
  { group: 'complexity', key: 'stretched', label: 'Растяжение металла', multiplier: 1.75, sort: 50 },
  { group: 'material', key: 'steel', label: 'Сталь', multiplier: 1, sort: 10 },
  { group: 'material', key: 'aluminum', label: 'Алюминий', multiplier: 1.35, sort: 20 },
  { group: 'material', key: 'plastic', label: 'Пластик', multiplier: 0.85, sort: 30 },
  { group: 'carClass', key: 'a', label: 'Класс A', multiplier: 0.9, sort: 10 },
  { group: 'carClass', key: 'b', label: 'Класс B', multiplier: 1, sort: 20 },
  { group: 'carClass', key: 'c', label: 'Класс C', multiplier: 1.05, sort: 30 },
  { group: 'carClass', key: 'd', label: 'Класс D', multiplier: 1.15, sort: 40 },
  { group: 'carClass', key: 'e', label: 'Класс E', multiplier: 1.3, sort: 50 },
  { group: 'carClass', key: 'suv', label: 'SUV', multiplier: 1.2, sort: 60 },
  { group: 'carClass', key: 'premium', label: 'Премиум', multiplier: 1.55, sort: 70 },
  { group: 'coating', key: 'factory', label: 'Заводское ЛКП', multiplier: 1, sort: 10 },
  { group: 'coating', key: 'film', label: 'Плёнка или керамика', multiplier: 1.15, sort: 20 },
  { group: 'coating', key: 'repaint', label: 'Перекрас', multiplier: 1.2, sort: 30 },
  { group: 'coating', key: 'damaged', label: 'Повреждённый лак', multiplier: 0.8, sort: 40 },
];

export const AREA_MATRIX: AreaMatrix = {
  widths: [15, 30, 50, 80, 120],
  lengths: [80, 160, 300, 500, 800],
  prices: [
    [900, 1400, 2200, 3200, 4500],
    [1400, 2200, 3400, 4800, 6800],
    [2200, 3200, 4800, 7000, 9800],
    [3200, 4600, 6800, 9800, 14000],
    [4500, 6400, 9600, 14000, 19000],
  ],
};

export interface ServiceDefault {
  directionCode: string;
  name: string;
  price: number;
  isComplex: boolean;
  minutes: number;
}

export const SERVICES: ServiceDefault[] = [
  { directionCode: 'pdr', name: 'Локальная вмятина, ручная оценка', price: 2500, isComplex: false, minutes: 40 },
  { directionCode: 'pdr', name: 'Пакет града до 10 точек', price: 8000, isComplex: true, minutes: 180 },
  { directionCode: 'body', name: 'Рихтовка элемента', price: 7000, isComplex: false, minutes: 180 },
  { directionCode: 'body', name: 'Восстановление геометрии проёма', price: 15000, isComplex: true, minutes: 360 },
  { directionCode: 'body', name: 'Замена бампера, работа', price: 4500, isComplex: false, minutes: 90 },
  { directionCode: 'paint', name: 'Покраска элемента', price: 12000, isComplex: false, minutes: 480 },
  { directionCode: 'paint', name: 'Локальный подкрас', price: 6000, isComplex: false, minutes: 240 },
  { directionCode: 'paint', name: 'Подбор эмали', price: 2500, isComplex: false, minutes: 60 },
  { directionCode: 'polish', name: 'Полировка элемента', price: 3000, isComplex: false, minutes: 60 },
  { directionCode: 'polish', name: 'Полировка кузова', price: 18000, isComplex: true, minutes: 360 },
  { directionCode: 'polish', name: 'Керамика, один слой', price: 15000, isComplex: true, minutes: 300 },
  { directionCode: 'film', name: 'Оклейка элемента', price: 8000, isComplex: false, minutes: 120 },
  { directionCode: 'film', name: 'Антигравийная плёнка капота', price: 22000, isComplex: false, minutes: 240 },
  { directionCode: 'film', name: 'Полная оклейка кузова', price: 160000, isComplex: true, minutes: 2400 },
  { directionCode: 'tint', name: 'Тонировка передней полусферы', price: 5000, isComplex: false, minutes: 90 },
  { directionCode: 'tint', name: 'Тонировка задней полусферы', price: 7000, isComplex: true, minutes: 120 },
  { directionCode: 'tint', name: 'Съём старой плёнки', price: 2000, isComplex: false, minutes: 60 },
  { directionCode: 'glass', name: 'Ремонт скола', price: 2500, isComplex: false, minutes: 40 },
  { directionCode: 'glass', name: 'Замена лобового стекла, работа', price: 8000, isComplex: false, minutes: 120 },
  { directionCode: 'glass', name: 'Полировка стекла', price: 3500, isComplex: false, minutes: 60 },
  { directionCode: 'optics', name: 'Полировка фар', price: 4000, isComplex: false, minutes: 70 },
  { directionCode: 'optics', name: 'Бронирование фар', price: 6000, isComplex: false, minutes: 80 },
  { directionCode: 'optics', name: 'Регулировка света', price: 1500, isComplex: false, minutes: 30 },
  { directionCode: 'detail', name: 'Мойка кузова', price: 1500, isComplex: false, minutes: 40 },
  { directionCode: 'detail', name: 'Химчистка салона', price: 12000, isComplex: true, minutes: 300 },
  { directionCode: 'detail', name: 'Детейлинг-комплекс', price: 25000, isComplex: true, minutes: 480 },
];

export interface ArmatureDefault {
  name: string;
  panelCode?: string;
  price: number;
  minutes: number;
}

export const ARMATURE: ArmatureDefault[] = [
  { name: 'Снятие карты двери', panelCode: 'door-fl', price: 800, minutes: 20 },
  { name: 'Снятие обшивки потолка', panelCode: 'roof', price: 2500, minutes: 50 },
  { name: 'Снятие заднего фонаря', panelCode: 'taillight-l', price: 600, minutes: 15 },
  { name: 'Снятие переднего бампера', panelCode: 'bumper-f', price: 1500, minutes: 30 },
  { name: 'Снятие заднего бампера', panelCode: 'bumper-r', price: 1400, minutes: 30 },
  { name: 'Снятие подкрылка', panelCode: 'fender-fl', price: 700, minutes: 15 },
  { name: 'Частичная разборка салона', price: 1800, minutes: 40 },
  { name: 'Снятие молдинга', price: 400, minutes: 15 },
  { name: 'Демонтаж фары', panelCode: 'headlight-l', price: 900, minutes: 20 },
];

export const DEFAULT_POLICY = {
  travelBaseFee: 2500,
  travelPerKm: 80,
  adjustMin: -20,
  adjustMax: 40,
  adjustStep: 5,
  staffCanAdjust: true,
  priceRoundTo: 50,
  minOrder: 1000,
};
