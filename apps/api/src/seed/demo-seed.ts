import {
  AREA_MATRIX,
  ARMATURE,
  COEFFICIENTS,
  CONTROL_POINTS,
  DEFAULT_POLICY,
  DIRECTIONS,
  SERVICES,
  panelName,
  pdrTitle,
  quotePdr,
  type PdrInput,
  type PricingConfig,
} from '@pdrforge/shared';
import { Prisma, PrismaClient } from '@prisma/client';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { resolveAssets, resolveUploads } from '../common/paths';

const config: PricingConfig = {
  controlPoints: CONTROL_POINTS,
  coefficients: COEFFICIENTS,
  matrix: AREA_MATRIX,
  adjustMin: DEFAULT_POLICY.adjustMin,
  adjustMax: DEFAULT_POLICY.adjustMax,
  adjustStep: DEFAULT_POLICY.adjustStep,
  priceRoundTo: DEFAULT_POLICY.priceRoundTo,
};

export async function seedDemo(prisma: PrismaClient): Promise<boolean> {
  if ((await prisma.workshop.count()) > 0) return false;
  copyDemoPhotos();
  await prisma.$transaction(async (tx) => {
    await writeDemo(tx);
  }, { timeout: 120_000 });
  return true;
}

async function writeDemo(db: Prisma.TransactionClient) {
  const workshop = await db.workshop.create({
    data: {
      name: 'Северный Контур',
      legalName: 'ИП Волков Алексей Сергеевич',
      phone: '+7 (843) 210-44-90',
      email: 'hello@severny-kontur.local',
      city: 'Казань',
      address: 'ул. Техническая, 14',
      inn: '165812345678',
      ogrn: '316169000012345',
      kpp: '',
      vatEnabled: false,
      vatRate: 0,
      bankName: 'АО «Демо Банк»',
      bik: '049205001',
      account: '40802810000000012345',
      corrAccount: '30101810000000000001',
      stampText: 'ИП Волков А.С., ИНН 165812345678. Документ сформирован в PDRForge и подтверждается подписью исполнителя.',
      ...DEFAULT_POLICY,
    },
  });

  await db.directionSetting.createMany({
    data: [
      ...DIRECTIONS.map((item) => ({
        workshopId: workshop.id,
        code: item.code,
        name: item.name,
        enabled: true,
        isCustom: false,
        sort: item.sort,
      })),
      {
        workshopId: workshop.id,
        code: 'custom-anticor',
        name: 'Антикор скрытых полостей',
        enabled: true,
        isCustom: true,
        sort: 100,
      },
    ],
  });
  await db.controlPoint.createMany({
    data: CONTROL_POINTS.map((point) => ({ workshopId: workshop.id, ...point })),
  });
  await db.coefficient.createMany({
    data: COEFFICIENTS.map((item) => ({
      workshopId: workshop.id,
      group: item.group,
      key: item.key,
      label: item.label,
      multiplier: item.multiplier,
      sort: item.sort ?? 0,
    })),
  });
  await db.areaMatrix.create({
    data: {
      workshopId: workshop.id,
      widths: AREA_MATRIX.widths,
      lengths: AREA_MATRIX.lengths,
      prices: AREA_MATRIX.prices,
    },
  });
  const armature = await Promise.all(
    ARMATURE.map((item) =>
      db.armatureItem.create({
        data: { workshopId: workshop.id, name: item.name, panelCode: item.panelCode, price: item.price, minutes: item.minutes },
      }),
    ),
  );
  const services = await Promise.all(
    [
      ...SERVICES,
      { directionCode: 'custom-anticor', name: 'Антикор днища', price: 9000, isComplex: true, minutes: 180 },
    ].map((item) => db.serviceItem.create({ data: { workshopId: workshop.id, ...item } })),
  );
  const serviceByName = new Map(services.map((item) => [item.name, item]));
  const armatureByName = new Map(armature.map((item) => [item.name, item]));

  const staff = await Promise.all(
    [
      ['Алексей Волков', 'owner', 'Владелец', '+7 843 210-44-90', 'volkov@severny-kontur.local', '#ff7a2f'],
      ['Марина Соколова', 'admin', 'Администратор', '+7 843 210-44-91', 'sokolova@severny-kontur.local', '#3c8dff'],
      ['Игорь Лебедев', 'master', 'Мастер PDR', '+7 917 200-11-32', 'lebedev@severny-kontur.local', '#3ddc97'],
      ['Денис Кравцов', 'master', 'Маляр', '+7 917 200-11-48', 'kravtsov@severny-kontur.local', '#c084fc'],
    ].map(([name, role, title, phone, email, color]) =>
      db.employee.create({
        data: { workshopId: workshop.id, name, role, title, phone, email, color },
      }),
    ),
  );
  const byStaff = new Map(staff.map((item) => [item.name, item]));

  const people: {
    key: string;
    kind: string;
    name: string;
    phone: string;
    email?: string;
    inn?: string;
    notes?: string;
    cars: {
      plate: string;
      make: string;
      model: string;
      year: number;
      vin: string;
      mileage: number;
      carClass: string;
      color: string;
      bodyType: string;
    }[];
  }[] = [
    {
      key: 'kamil',
      kind: 'person',
      name: 'Камиль Зарипов',
      phone: '+7 917 300-10-01',
      email: 'kamil@example.local',
      cars: [
        car('А777КМ 116', 'Toyota', 'Camry', 2019, 'XW8DEMO0CAMRY0001', 86400, 'd', 'Чёрный', 'седан'),
        car('О505РН 116', 'Kia', 'Sportage', 2021, 'XW8DEMO0SPORT0002', 41200, 'suv', 'Белый', 'кроссовер'),
      ],
    },
    {
      key: 'olga',
      kind: 'person',
      name: 'Ольга Мельникова',
      phone: '+7 903 111-22-33',
      cars: [car('В321ТХ 716', 'BMW', 'X5', 2018, 'XW8DEMO0BMWX50003', 120400, 'premium', 'Серый', 'кроссовер')],
    },
    {
      key: 'sever',
      kind: 'company',
      name: 'ООО «СеверТранс»',
      phone: '+7 843 555-19-00',
      email: 'buh@severtrans.local',
      inn: '1655432109',
      notes: 'Закрывающие документы на почту бухгалтерии. Контакт — Регина.',
      cars: [
        car('М014СС 116', 'ГАЗ', 'Газель Next', 2020, 'XW8DEMO0GAZEL0004', 210000, 'c', 'Белый', 'фургон'),
        car('К908УЕ 116', 'ГАЗ', 'Газель Next', 2022, 'XW8DEMO0GAZEL0005', 98000, 'c', 'Белый', 'фургон'),
      ],
    },
    {
      key: 'ruslan',
      kind: 'person',
      name: 'Руслан Гимаев',
      phone: '+7 960 222-33-44',
      cars: [car('Е214ОР 116', 'Hyundai', 'Solaris', 2020, 'XW8DEMO0SOLAR0006', 67300, 'b', 'Серебро', 'седан')],
    },
    {
      key: 'dinara',
      kind: 'person',
      name: 'Динара Хасанова',
      phone: '+7 917 444-55-66',
      cars: [car('Т650АХ 116', 'Volkswagen', 'Polo', 2017, 'XW8DEMO0POLO00007', 141200, 'b', 'Красный', 'седан')],
    },
    {
      key: 'pavel',
      kind: 'person',
      name: 'Павел Ершов',
      phone: '+7 903 777-88-99',
      notes: 'Просит предупреждать за час до выезда.',
      cars: [car('Н073КЕ 116', 'Mercedes-Benz', 'E 200', 2016, 'XW8DEMO0MERCE0008', 158900, 'premium', 'Чёрный', 'седан')],
    },
    {
      key: 'alina',
      kind: 'person',
      name: 'Алина Кузнецова',
      phone: '+7 917 121-09-45',
      cars: [car('С441МТ 116', 'Skoda', 'Octavia', 2022, 'XW8DEMO0OCTAV0009', 35600, 'c', 'Синий', 'лифтбек')],
    },
    {
      key: 'marat',
      kind: 'person',
      name: 'Марат Сафин',
      phone: '+7 950 303-40-50',
      cars: [
        car('У118ВК 116', 'Lada', 'Vesta', 2023, 'XW8DEMO0VESTA0010', 22100, 'b', 'Серый', 'седан'),
        car('А018КХ 116', 'Renault', 'Duster', 2019, 'XW8DEMO0DUSTE0011', 99000, 'suv', 'Коричневый', 'кроссовер'),
      ],
    },
    {
      key: 'igorc',
      kind: 'person',
      name: 'Игорь Пантелеев',
      phone: '+7 904 616-17-18',
      cars: [car('Р700ОМ 116', 'Audi', 'A6', 2015, 'XW8DEMO0AUDIA0012', 176500, 'e', 'Белый', 'седан')],
    },
  ];

  const plates = new Map<string, { id: string; clientId: string }>();
  for (const person of people) {
    const client = await db.client.create({
      data: {
        workshopId: workshop.id,
        kind: person.kind,
        name: person.name,
        phone: person.phone,
        email: person.email,
        inn: person.inn,
        notes: person.notes,
      },
    });
    for (const item of person.cars) {
      const vehicle = await db.vehicle.create({
        data: { workshopId: workshop.id, clientId: client.id, ...item },
      });
      plates.set(item.plate, { id: vehicle.id, clientId: client.id });
    }
  }

  const specs: OrderSpec[] = [
    {
      plate: 'А777КМ 116',
      status: 'in_progress',
      days: 0,
      hour: 10,
      duration: 150,
      assignee: 'Игорь Лебедев',
      notes: 'Клиент заберёт машину к 16:00. Капот уже в работе.',
      mileageAt: 86420,
      payments: [{ amount: 5000, method: 'card' }],
      lines: [
        {
          pdr: input('oval', { widthMm: 48, heightMm: 32, carClassKey: 'd' }),
          panel: 'hood',
          photos: [
            { phase: 'before', url: '/uploads/demo/hood-before.svg' },
            { phase: 'after', url: '/uploads/demo/hood-after.svg' },
          ],
        },
        { pdr: input('circle', { diameterMm: 18, carClassKey: 'd' }), panel: 'fender-fl' },
        { armature: 'Снятие подкрылка' },
      ],
    },
    {
      plate: 'Е214ОР 116',
      status: 'planned',
      days: 1,
      hour: 11,
      minute: 30,
      duration: 240,
      assignee: 'Игорь Лебедев',
      notes: 'Град на ночной стоянке у торгового центра. Потолок снимать.',
      lines: [
        {
          pdr: input('circle', { diameterMm: 12, count: 24, hailKey: 'dense', complexityKey: 'hard', carClassKey: 'b' }),
          panel: 'roof',
          photos: [{ phase: 'before', url: '/uploads/demo/roof-before.svg' }],
        },
        { pdr: input('circle', { diameterMm: 10, count: 16, hailKey: 'dense', carClassKey: 'b' }), panel: 'hood' },
        { armature: 'Снятие обшивки потолка' },
      ],
    },
    {
      plate: 'В321ТХ 716',
      status: 'in_progress',
      days: 0,
      hour: 13,
      duration: 180,
      assignee: 'Игорь Лебедев',
      notes: 'Капот алюминиевый, защитная плёнка остаётся на детали.',
      payments: [{ amount: 4000, method: 'transfer' }],
      lines: [
        {
          pdr: input('circle', { diameterMm: 35, materialKey: 'aluminum', carClassKey: 'premium', coatingKey: 'film', complexityKey: 'hard' }),
          panel: 'hood',
        },
      ],
    },
    {
      plate: 'Т650АХ 116',
      status: 'done',
      days: -3,
      hour: 15,
      duration: 200,
      assignee: 'Денис Кравцов',
      mileageAt: 141200,
      payFull: true,
      lines: [
        { service: 'Полировка элемента', panel: 'hood' },
        { service: 'Полировка элемента', panel: 'trunk' },
      ],
    },
    {
      plate: 'М014СС 116',
      status: 'done',
      days: -1,
      hour: 9,
      duration: 120,
      assignee: 'Денис Кравцов',
      notes: 'Нужен акт для бухгалтерии СеверТранс.',
      payFull: true,
      payMethod: 'transfer',
      lines: [{ service: 'Замена бампера, работа', panel: 'bumper-f' }],
    },
    {
      plate: 'Н073КЕ 116',
      status: 'planned',
      days: 2,
      hour: 12,
      duration: 200,
      assignee: 'Игорь Лебедев',
      notes: 'Выезд в гараж на улице Горького.',
      travelKm: 18,
      lines: [
        {
          pdr: input('oval', { widthMm: 60, heightMm: 25, carClassKey: 'premium', coatingKey: 'repaint', complexityKey: 'double' }),
          panel: 'door-fl',
          photos: [{ phase: 'before', url: '/uploads/demo/door-before.svg' }],
        },
        { armature: 'Снятие карты двери' },
      ],
    },
    {
      plate: 'С441МТ 116',
      status: 'draft',
      duration: 300,
      notes: 'Ждёт согласования химчистки. Дату не ставили.',
      lines: [{ service: 'Химчистка салона', panel: 'whole' }],
    },
    {
      plate: 'У118ВК 116',
      status: 'planned',
      days: 0,
      hour: 16,
      minute: 30,
      duration: 70,
      assignee: 'Игорь Лебедев',
      notes: 'Порог притёрт о бордюр, лак целый.',
      lines: [{ pdr: input('stripe', { lengthMm: 420, widthMm: 28, carClassKey: 'b' }), panel: 'sill-l' }],
    },
    {
      plate: 'А018КХ 116',
      status: 'done',
      days: -7,
      hour: 12,
      duration: 80,
      assignee: 'Денис Кравцов',
      payFull: true,
      lines: [{ service: 'Полировка фар', panel: 'whole' }],
    },
    {
      plate: 'Р700ОМ 116',
      status: 'planned',
      days: 1,
      hour: 9,
      minute: 30,
      duration: 480,
      assignee: 'Денис Кравцов',
      notes: 'Сначала геометрия крыла, на следующий заход эмаль.',
      payments: [{ amount: 7000, method: 'card' }],
      lines: [
        { service: 'Рихтовка элемента', panel: 'fender-rr' },
        { service: 'Покраска элемента', panel: 'fender-rr' },
      ],
    },
    {
      plate: 'О505РН 116',
      status: 'done',
      days: -18,
      hour: 11,
      duration: 40,
      assignee: 'Игорь Лебедев',
      payFull: true,
      lines: [{ service: 'Ремонт скола', panel: 'windshield' }],
    },
    {
      plate: 'В321ТХ 716',
      status: 'done',
      days: -40,
      hour: 10,
      duration: 240,
      assignee: 'Денис Кравцов',
      payFull: true,
      payMethod: 'transfer',
      lines: [{ service: 'Антигравийная плёнка капота', panel: 'hood' }],
    },
    {
      plate: 'Т650АХ 116',
      status: 'planned',
      days: 3,
      hour: 14,
      duration: 120,
      assignee: 'Денис Кравцов',
      lines: [{ service: 'Тонировка задней полусферы', panel: 'whole' }],
    },
    {
      plate: 'К908УЕ 116',
      status: 'draft',
      duration: 180,
      notes: 'Осмотр на подъёмнике, антикор ещё не подтверждён.',
      lines: [{ service: 'Антикор днища', panel: 'whole' }],
    },
    {
      plate: 'С441МТ 116',
      status: 'done',
      days: -6,
      hour: 17,
      duration: 50,
      assignee: 'Марина Соколова',
      payFull: true,
      payMethod: 'cash',
      lines: [{ service: 'Мойка кузова', panel: 'whole' }],
    },
    {
      plate: 'Е214ОР 116',
      status: 'done',
      days: -12,
      hour: 16,
      duration: 50,
      assignee: 'Игорь Лебедев',
      payFull: true,
      lines: [{ pdr: input('circle', { diameterMm: 25, carClassKey: 'b', complexityKey: 'easy' }), panel: 'door-rr' }],
    },
  ];

  let sequence = 1001;
  for (const spec of specs) {
    const vehicle = plates.get(spec.plate);
    if (!vehicle) throw new Error(`Нет автомобиля ${spec.plate}`);
    const when = spec.days == null ? null : at(spec.days, spec.hour ?? 10, spec.minute ?? 0);
    const order = await db.order.create({
      data: {
        workshopId: workshop.id,
        number: `ПФ-${sequence}`,
        clientId: vehicle.clientId,
        vehicleId: vehicle.id,
        status: spec.status,
        scheduledAt: when,
        durationMin: spec.duration,
        assigneeId: spec.assignee ? byStaff.get(spec.assignee)?.id : null,
        notes: spec.notes ?? '',
        travelEnabled: Boolean(spec.travelKm),
        travelKm: spec.travelKm ?? 0,
        mileageAt: spec.mileageAt,
        createdAt: when ?? at(-1, 12),
      },
    });
    sequence += 1;
    let sort = 0;
    let labor = 0;
    for (const line of spec.lines) {
      if ('pdr' in line && line.pdr) {
        const breakdown = quotePdr(line.pdr, config);
        const name = panelName(line.panel);
        labor += breakdown.lineTotal;
        const created = await db.orderLine.create({
          data: {
            orderId: order.id,
            directionCode: 'pdr',
            kind: 'pdr',
            panelCode: line.panel,
            panelName: name,
            title: pdrTitle(line.pdr, name),
            description: breakdown.multipliers.map((item) => item.label).join(' · '),
            qty: breakdown.qty,
            unitPrice: breakdown.unitPrice,
            total: breakdown.lineTotal,
            minutes: Math.max(20, breakdown.qty * 8),
            sort,
            snapshot: { input: line.pdr, breakdown } as unknown as Prisma.InputJsonValue,
          },
        });
        if (line.photos?.length) {
          await db.photo.createMany({
            data: line.photos.map((photo) => ({ lineId: created.id, phase: photo.phase, url: photo.url })),
          });
        }
      } else if ('service' in line && line.service) {
        const service = serviceByName.get(line.service);
        if (!service) throw new Error(`Нет услуги ${line.service}`);
        labor += service.price;
        await db.orderLine.create({
          data: {
            orderId: order.id,
            directionCode: service.directionCode,
            kind: service.isComplex ? 'complex' : 'service',
            panelCode: line.panel,
            panelName: panelName(line.panel),
            title: service.name,
            qty: 1,
            unitPrice: service.price,
            total: service.price,
            minutes: service.minutes,
            sort,
          },
        });
      } else if ('armature' in line && line.armature) {
        const item = armatureByName.get(line.armature);
        if (!item) throw new Error(`Нет арматуры ${line.armature}`);
        labor += item.price;
        await db.orderLine.create({
          data: {
            orderId: order.id,
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
      sort += 1;
    }
    const travel = spec.travelKm ? DEFAULT_POLICY.travelBaseFee + spec.travelKm * DEFAULT_POLICY.travelPerKm : 0;
    const minLift = DEFAULT_POLICY.minOrder > labor ? DEFAULT_POLICY.minOrder - labor : 0;
    const grand = labor + minLift + travel;
    const payments = spec.payFull ? [{ amount: grand, method: spec.payMethod || 'card' }] : spec.payments || [];
    for (const payment of payments) {
      await db.payment.create({
        data: {
          orderId: order.id,
          amount: payment.amount,
          method: payment.method,
          paidAt: when ?? at(-1, 18),
        },
      });
    }
  }

  await db.expense.createMany({
    data: [
      { workshopId: workshop.id, category: 'Аренда бокса', amount: 45000, spentAt: at(-2, 9), note: 'Ноябрь' },
      { workshopId: workshop.id, category: 'Материалы PDR', amount: 12800, spentAt: at(-6, 13), note: 'Клей и крючки' },
      { workshopId: workshop.id, category: 'Реклама', amount: 7000, spentAt: at(-12, 11), note: 'Карты и объявления' },
      { workshopId: workshop.id, category: 'Инструмент', amount: 12500, spentAt: at(-20, 15), note: 'Набор гладилок' },
      { workshopId: workshop.id, category: 'Аренда бокса', amount: 45000, spentAt: at(-35, 9), note: 'Октябрь' },
    ],
  });

  await db.notification.createMany({
    data: [
      {
        workshopId: workshop.id,
        type: 'schedule',
        title: 'Завтра плотный град',
        body: 'ПФ-1002, Solaris Руслана Гимаева: крыша и капот, с 11:30. Игорю лучше не ставить выезд поверх.',
        read: false,
        createdAt: at(0, 8, 10),
      },
      {
        workshopId: workshop.id,
        type: 'money',
        title: 'По BMW осталась доплата',
        body: 'ПФ-1003 в работе, перевод на 4 000 ₽ уже есть. Остаток виден в заявке.',
        read: false,
        createdAt: at(0, 9, 5),
      },
      {
        workshopId: workshop.id,
        type: 'travel',
        title: 'Выезд через два дня',
        body: 'ПФ-1006, Mercedes Павла Ершова, 18 км. Предупредить за час.',
        read: false,
        createdAt: at(0, 9, 20),
      },
      {
        workshopId: workshop.id,
        type: 'document',
        title: 'Акт для СеверТранс готов',
        body: 'ПФ-1005 закрыта. Акт и заказ-наряд скачиваются из заявки.',
        read: true,
        createdAt: at(-1, 18),
      },
      {
        workshopId: workshop.id,
        type: 'system',
        title: 'Демо-мастерская собрана',
        body: 'Северный Контур заполнен клиентами, заявками и настройками конструктора. Можно править всё локально.',
        read: true,
        createdAt: at(0, 7, 40),
      },
    ],
  });
}

function car(
  plate: string,
  make: string,
  model: string,
  year: number,
  vin: string,
  mileage: number,
  carClass: string,
  color: string,
  bodyType: string,
) {
  return { plate, make, model, year, vin, mileage, carClass, color, bodyType };
}

function input(shape: PdrInput['shape'], patch: Partial<PdrInput>): PdrInput {
  return {
    shape,
    count: 1,
    hailKey: 'none',
    complexityKey: 'standard',
    materialKey: 'steel',
    carClassKey: 'b',
    coatingKey: 'factory',
    adjustPercent: 0,
    ...patch,
  };
}

function at(days: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function copyDemoPhotos() {
  const source = path.join(resolveAssets(), 'demo-photos');
  const target = path.join(resolveUploads(), 'demo');
  if (!existsSync(source)) return;
  mkdirSync(target, { recursive: true });
  for (const name of ['hood-before.svg', 'hood-after.svg', 'roof-before.svg', 'door-before.svg']) {
    const from = path.join(source, name);
    if (existsSync(from)) copyFileSync(from, path.join(target, name));
  }
}

interface OrderSpec {
  plate: string;
  status: string;
  days?: number;
  hour?: number;
  minute?: number;
  duration: number;
  assignee?: string;
  notes?: string;
  mileageAt?: number;
  travelKm?: number;
  payFull?: boolean;
  payMethod?: string;
  payments?: { amount: number; method: string }[];
  lines: (
    | { pdr: PdrInput; panel: string; photos?: { phase: string; url: string }[] }
    | { service: string; panel: string }
    | { armature: string }
  )[];
}
