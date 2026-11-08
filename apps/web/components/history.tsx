import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import { money, when } from '@/lib/format';
import type { Order } from '@/lib/types';

export function History({ title, orders }: { title: string; orders: Order[] }) {
  return (
    <section>
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-3 space-y-2">
        {orders.map((order) => (
          <Link key={order.id} href={`/app/orders/${order.id}`} className="panel flex items-center justify-between px-4 py-3">
            <div>
              <div>
                {order.number} · {order.vehicle.plate}
              </div>
              <div className="text-xs text-[#8b97a8]">{when(order.scheduledAt)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="num">{money(order.grandTotal)}</span>
              <StatusBadge status={order.status} />
            </div>
          </Link>
        ))}
        {!orders.length ? <p className="text-sm text-[#8b97a8]">Пока пусто.</p> : null}
      </div>
    </section>
  );
}
