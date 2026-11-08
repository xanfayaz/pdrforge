import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { PAY_METHOD_LABEL, type PayMethod } from '@pdrforge/shared';
import type { AuthUser } from '../common/auth-user';
import { resolveAssets, resolveUploads } from '../common/paths';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly orders: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  async workOrder(user: AuthUser, id: string) {
    return this.render(user, id, 'order');
  }

  async act(user: AuthUser, id: string) {
    return this.render(user, id, 'act');
  }

  private async render(user: AuthUser, id: string, kind: 'order' | 'act') {
    const order = await this.orders.detail(user, id);
    const workshop = await this.prisma.workshop.findUnique({ where: { id: user.workshopId } });
    if (!workshop) throw new NotFoundException('Мастерская не найдена');
    const regular = path.join(resolveAssets(), 'fonts', 'NotoSans-Regular.ttf');
    const bold = path.join(resolveAssets(), 'fonts', 'NotoSans-Bold.ttf');
    if (!existsSync(regular) || !existsSync(bold)) {
      throw new NotFoundException('Не найдены шрифты PDF. Проверьте apps/api/assets/fonts.');
    }

    const doc = new PDFDocument({ size: 'A4', margin: 42 });
    doc.registerFont('regular', regular);
    doc.registerFont('bold', bold);
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.rect(0, 0, doc.page.width, 78).fill('#141920');
    let textX = 42;
    const logo = logoFile(workshop.logoPath);
    if (logo) {
      doc.image(logo, 36, 16, { fit: [46, 46] });
      textX = 92;
    }
    doc.fillColor('#8eb7ff').font('bold').fontSize(10).text('PDRFORGE', textX, 18, { lineBreak: false });
    doc.fillColor('#ffffff').fontSize(15).text(workshop.name, textX, 34, { width: 240, lineBreak: false });
    const title = kind === 'order' ? 'ЗАКАЗ-НАРЯД' : 'АКТ ВЫПОЛНЕННЫХ РАБОТ';
    doc.fillColor('#ff7a2f').fontSize(12).text(title, 300, 20, { width: 252, align: 'right', lineBreak: false });
    doc.fillColor('#e8eef6').font('regular').fontSize(11).text(order.number, 300, 40, { width: 252, align: 'right', lineBreak: false });
    doc.fillColor('#9aabbf').fontSize(8).text(formatWhen(order.scheduledAt || order.createdAt), 300, 56, {
      width: 252,
      align: 'right',
      lineBreak: false,
    });

    let y = 96;
    y = heading(doc, y, 'Стороны');
    const left = [
      workshop.legalName,
      `ИНН ${workshop.inn}${workshop.kpp ? `  КПП ${workshop.kpp}` : ''}`,
      `ОГРН ${workshop.ogrn}`,
      `${workshop.city}, ${workshop.address}`,
      workshop.phone,
      workshop.email,
      `${workshop.bankName}, БИК ${workshop.bik}`,
      `р/с ${workshop.account}`,
      `к/с ${workshop.corrAccount}`,
      workshop.vatEnabled ? `НДС ${workshop.vatRate}% включён в цены` : 'Без НДС',
    ];
    const right = [
      order.client.kind === 'company' ? 'Заказчик, юрлицо' : 'Заказчик',
      order.client.name,
      order.client.inn ? `ИНН ${order.client.inn}` : '',
      order.client.phone,
      order.client.email || '',
    ].filter(Boolean);
    y = columns(doc, y, 'Исполнитель', left, 'Заказчик', right);
    y = heading(doc, y, 'Автомобиль');
    doc.font('regular').fontSize(10).fillColor('#1c2430');
    doc.text(
      `${order.vehicle.make} ${order.vehicle.model}, ${order.vehicle.year} · ${order.vehicle.color} · ${order.vehicle.bodyType}`,
      42,
      y,
      { width: 510 },
    );
    y = doc.y + 3;
    doc.fillColor('#526070').text(
      `Госномер ${order.vehicle.plate}     VIN ${order.vehicle.vin}     Пробег ${order.mileageAt ?? order.vehicle.mileage} км`,
      42,
      y,
      { width: 510 },
    );
    y = doc.y + 8;
    if (order.assignee) {
      doc.text(`Мастер: ${order.assignee.name}${order.assignee.title ? `, ${order.assignee.title}` : ''}`, 42, y, { width: 510 });
      y = doc.y + 8;
    }

    y = heading(doc, y, 'Состав работ');
    y = table(doc, y, order.lines);

    y = space(doc, y, 150);
    const rows: [string, string, boolean][] = [['Работы', rub(order.laborTotal), false]];
    if (order.minLift > 0) rows.push(['Доплата до минимального заказа', rub(order.minLift), false]);
    if (order.travelFee > 0) rows.push([`Выезд мастера${order.travelKm ? `, ${order.travelKm} км` : ''}`, rub(order.travelFee), false]);
    rows.push(['Итого к оплате', rub(order.grandTotal), true]);
    if (workshop.vatEnabled && workshop.vatRate > 0) {
      const vat = Math.round((order.grandTotal * workshop.vatRate) / (100 + workshop.vatRate));
      rows.push([`В том числе НДС ${workshop.vatRate}%`, rub(vat), false]);
    }
    rows.push(['Оплачено', rub(order.paid), false]);
    rows.push(['Задолженность', rub(order.debt), true]);
    for (const [label, value, strong] of rows) {
      doc.font(strong ? 'bold' : 'regular').fontSize(10).fillColor(label === 'Задолженность' && order.debt > 0 ? '#9a3412' : '#1c2430');
      doc.text(label, 280, y, { width: 160, lineBreak: false });
      doc.text(value, 440, y, { width: 112, align: 'right', lineBreak: false });
      y += 16;
    }

    if (order.payments.length) {
      y += 6;
      doc.font('bold').fontSize(10).fillColor('#1c2430').text('Оплаты', 42, y);
      y = doc.y + 4;
      doc.font('regular').fontSize(9).fillColor('#526070');
      for (const payment of order.payments) {
        const method = PAY_METHOD_LABEL[payment.method as PayMethod] || payment.method;
        doc.text(`${formatWhen(payment.paidAt)} · ${method} · ${rub(payment.amount)}${payment.note ? ` · ${payment.note}` : ''}`, 42, y, { width: 510 });
        y = doc.y + 2;
      }
    }

    if (order.notes) {
      y += 8;
      doc.font('bold').fontSize(10).fillColor('#1c2430').text('Комментарий', 42, y);
      y = doc.y + 2;
      doc.font('regular').fontSize(10).text(order.notes, 42, y, { width: 510 });
      y = doc.y + 8;
    }

    const legal =
      kind === 'order'
        ? 'Исполнитель принимает автомобиль для перечисленных работ. После разборки объём и стоимость скрытых повреждений согласуются с заказчиком отдельно.'
        : 'Работы выполнены в согласованном объёме. Заказчик принял результат и претензий по качеству, срокам и комплектности не имеет.';
    y = space(doc, y + 8, 40);
    doc.font('regular').fontSize(9).fillColor('#526070').text(legal, 42, y, { width: 510 });
    y = doc.y + 12;

    y = space(doc, y, 78);
    doc.save();
    doc.dash(3, { space: 2 }).roundedRect(42, y, 510, 42, 6).strokeColor('#98a2b3').stroke();
    doc.restore();
    doc.font('regular').fontSize(8).fillColor('#526070').text(workshop.stampText, 52, y + 12, { width: 490 });
    y += 58;
    y = space(doc, y, 36);
    doc.font('regular').fontSize(10).fillColor('#1c2430');
    doc.text(`Исполнитель ______________ / ${workshop.legalName}`, 42, y, { width: 250 });
    doc.text(`Заказчик ______________ / ${order.client.name}`, 310, y, { width: 240 });

    doc.end();
    return done;
  }
}

function logoFile(logoPath?: string | null) {
  if (!logoPath) return null;
  const file = path.join(resolveUploads(), path.basename(logoPath));
  if (!existsSync(file)) return null;
  if (!/\.(png|jpe?g)$/i.test(file)) return null;
  return file;
}

function rub(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function formatWhen(value: Date | string | null) {
  if (!value) return 'без даты';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function heading(doc: PDFKit.PDFDocument, y: number, text: string) {
  const next = space(doc, y, 28);
  doc.font('bold').fontSize(11).fillColor('#12315f').text(text, 42, next, { lineBreak: false });
  doc.moveTo(42, next + 16).lineTo(552, next + 16).strokeColor('#3c8dff').lineWidth(1).stroke();
  return next + 24;
}

function columns(doc: PDFKit.PDFDocument, y: number, leftTitle: string, left: string[], rightTitle: string, right: string[]) {
  const height = 12 + Math.max(left.length, right.length) * 12;
  doc.font('bold').fontSize(9).fillColor('#12315f').text(leftTitle, 42, y, { width: 240, lineBreak: false });
  doc.text(rightTitle, 310, y, { width: 240, lineBreak: false });
  doc.font('regular').fontSize(8).fillColor('#1c2430');
  left.forEach((line, index) => doc.text(line, 42, y + 14 + index * 12, { width: 250, lineBreak: false }));
  right.forEach((line, index) => doc.text(line, 310, y + 14 + index * 12, { width: 240, lineBreak: false }));
  return y + height + 8;
}

function table(
  doc: PDFKit.PDFDocument,
  y: number,
  lines: { title: string; description: string; panelName: string | null; qty: number; unitPrice: number; total: number }[],
) {
  const drawHead = (top: number) => {
    doc.rect(42, top, 510, 18).fill('#1c232c');
    doc.fillColor('#ffffff').font('bold').fontSize(8);
    doc.text('№', 48, top + 5, { width: 20, lineBreak: false });
    doc.text('Работа', 72, top + 5, { width: 250, lineBreak: false });
    doc.text('Кол.', 330, top + 5, { width: 36, lineBreak: false });
    doc.text('Цена', 370, top + 5, { width: 70, align: 'right', lineBreak: false });
    doc.text('Сумма', 450, top + 5, { width: 94, align: 'right', lineBreak: false });
    return top + 18;
  };
  let cursor = drawHead(y);
  if (!lines.length) {
    doc.font('regular').fontSize(9).fillColor('#526070').text('Позиции не добавлены', 48, cursor + 6);
    return cursor + 24;
  }
  lines.forEach((line, index) => {
    const text = [line.panelName, line.title, line.description].filter(Boolean).join(' — ');
    doc.font('regular').fontSize(8);
    const height = Math.max(22, doc.heightOfString(text, { width: 250 }) + 10);
    if (cursor + height > doc.page.height - 56) {
      doc.addPage();
      cursor = drawHead(48);
    }
    if (index % 2 === 0) doc.rect(42, cursor, 510, height).fill('#f4f7fb');
    doc.fillColor('#1c2430').text(String(index + 1), 48, cursor + 6, { width: 20, lineBreak: false });
    doc.text(text, 72, cursor + 6, { width: 250 });
    doc.text(String(line.qty), 330, cursor + 6, { width: 36, lineBreak: false });
    doc.text(rub(line.unitPrice), 370, cursor + 6, { width: 70, align: 'right', lineBreak: false });
    doc.text(rub(line.total), 450, cursor + 6, { width: 94, align: 'right', lineBreak: false });
    cursor += height;
  });
  return cursor + 12;
}

function space(doc: PDFKit.PDFDocument, y: number, needed: number) {
  if (y + needed <= doc.page.height - 42) return y;
  doc.addPage();
  return 48;
}
