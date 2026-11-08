import type { OrderStatus, PayMethod, UserRole } from './types';

export interface PanelDef {
  id: string;
  name: string;
  zone: 'front' | 'side' | 'roof' | 'rear' | 'glass' | 'light';
  glass?: boolean;
}

export const PANELS: PanelDef[] = [
  { id: 'bumper-f', name: 'Бампер передний', zone: 'front' },
  { id: 'hood', name: 'Капот', zone: 'front' },
  { id: 'fender-fl', name: 'Крыло переднее левое', zone: 'front' },
  { id: 'fender-fr', name: 'Крыло переднее правое', zone: 'front' },
  { id: 'headlight-l', name: 'Фара левая', zone: 'light' },
  { id: 'headlight-r', name: 'Фара правая', zone: 'light' },
  { id: 'windshield', name: 'Лобовое стекло', zone: 'glass', glass: true },
  { id: 'roof', name: 'Крыша', zone: 'roof' },
  { id: 'roof-rail-l', name: 'Рейлинг левый', zone: 'roof' },
  { id: 'roof-rail-r', name: 'Рейлинг правый', zone: 'roof' },
  { id: 'mirror-l', name: 'Зеркало левое', zone: 'side' },
  { id: 'mirror-r', name: 'Зеркало правое', zone: 'side' },
  { id: 'door-fl', name: 'Дверь передняя левая', zone: 'side' },
  { id: 'door-fr', name: 'Дверь передняя правая', zone: 'side' },
  { id: 'door-rl', name: 'Дверь задняя левая', zone: 'side' },
  { id: 'door-rr', name: 'Дверь задняя правая', zone: 'side' },
  { id: 'sill-l', name: 'Порог левый', zone: 'side' },
  { id: 'sill-r', name: 'Порог правый', zone: 'side' },
  { id: 'rear-glass', name: 'Стекло заднее', zone: 'glass', glass: true },
  { id: 'trunk', name: 'Крышка багажника', zone: 'rear' },
  { id: 'fender-rl', name: 'Крыло заднее левое', zone: 'rear' },
  { id: 'fender-rr', name: 'Крыло заднее правое', zone: 'rear' },
  { id: 'taillight-l', name: 'Фонарь левый', zone: 'light' },
  { id: 'taillight-r', name: 'Фонарь правый', zone: 'light' },
  { id: 'bumper-r', name: 'Бампер задний', zone: 'rear' },
];

export const WHOLE_CAR = { id: 'whole', name: 'Весь автомобиль' };

export function panelName(id?: string | null): string {
  if (!id || id === 'whole') return WHOLE_CAR.name;
  return PANELS.find((panel) => panel.id === id)?.name ?? id;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Черновик',
  planned: 'В плане',
  in_progress: 'В работе',
  done: 'Готово',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  master: 'Мастер',
};

export const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
};

export const CAR_CLASS_LABEL: Record<string, string> = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  e: 'E',
  suv: 'SUV',
  premium: 'Премиум',
};

export const DIRECTION_BLURB: Record<string, string> = {
  pdr: 'Вмятины без покраски: ручная цена или конструктор с матрицей.',
  body: 'Рихтовка, геометрия, замена элементов и подготовка.',
  paint: 'Окрас элемента, локальный подкрас, подбор эмали.',
  polish: 'Полировка ЛКП и защитные составы.',
  film: 'Антигравий, винил и оклейка элементов.',
  tint: 'Тонировка стёкол и съём старой плёнки.',
  glass: 'Сколы, замена стёкол, полировка.',
  optics: 'Фары: полировка, бронирование, свет.',
  detail: 'Мойка, химчистка и детейлинг-комплексы.',
};
