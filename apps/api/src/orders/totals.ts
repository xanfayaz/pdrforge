import { travelFee } from '@pdrforge/shared';

interface MoneyOrder {
  lines: { total: number }[];
  payments: { amount: number }[];
  travelEnabled: boolean;
  travelKm: number;
}

interface MoneyWorkshop {
  travelBaseFee: number;
  travelPerKm: number;
  minOrder: number;
}

export function presentOrder<T extends MoneyOrder>(order: T, workshop: MoneyWorkshop) {
  const laborTotal = order.lines.reduce((sum, line) => sum + line.total, 0);
  const minLift = workshop.minOrder > laborTotal ? workshop.minOrder - laborTotal : 0;
  const fee = travelFee(workshop.travelBaseFee, workshop.travelPerKm, order.travelEnabled, order.travelKm);
  const grandTotal = laborTotal + minLift + fee;
  const paid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return {
    ...order,
    laborTotal,
    minLift,
    travelFee: fee,
    grandTotal,
    paid,
    debt: Math.max(0, grandTotal - paid),
    overpaid: Math.max(0, paid - grandTotal),
  };
}
