'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';
import { money, when } from '@/lib/format';
import type { Analytics, Notice, Order } from '@/lib/types';

export default function DashboardPage() {
  const analytics = useQuery({ queryKey: ['analytics'], queryFn: () => api<Analytics>('/analytics') });
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
  const orders = useQuery({
    queryKey: ['orders', 'today'],
    queryFn: () => api<{ items: Order[] }>(`/orders?from=${from}&to=${to}`),
  });
  const notes = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ items: Notice[]; unread: number }>('/notifications'),
  });
  const data = analytics.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Сегодня в боксе</h1>
        <p className="text-sm text-[#8b97a8]">Сводка месяца и записи на текущий день.</p>
      </div>
      <section className="grid gap-3 md:grid-cols-4">
        <Stat label="Начислено за месяц" value={money(data?.accrued)} />
        <Stat label="Средний чек готовых" value={money(data?.averageCheck)} />
        <Stat label="Открытый долг" value={money(data?.openDebt)} />
        <Stat label="Загрузка" value={data ? `${Math.round(data.load * 100)}%` : '—'} />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-4">
          <h2 className="font-display text-xl">Записи на сегодня</h2>
          <div className="mt-3 space-y-2">
            {(orders.data?.items || []).map((order) => (
              <Link key={order.id} href={`/app/orders/${order.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2">
                <div>
                  <div className="text-sm">
                    {order.number} · {order.client.name}
                  </div>
                  <div className="text-xs text-[#8b97a8]">
                    {when(order.scheduledAt)} · {order.vehicle.plate} · {order.assignee?.name || 'без мастера'}
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </Link>
            ))}
            {!orders.data?.items?.length ? <p className="text-sm text-[#8b97a8]">На сегодня записей нет.</p> : null}
          </div>
        </div>
        <div className="panel p-4">
          <h2 className="font-display text-xl">Уведомления</h2>
          <div className="mt-3 space-y-3">
            {(notes.data?.items || []).slice(0, 4).map((note) => (
              <div key={note.id} className={note.read ? 'opacity-60' : ''}>
                <div className="text-sm">{note.title}</div>
                <p className="text-xs text-[#8b97a8]">{note.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="panel p-4">
      <div className="text-xs uppercase tracking-wide text-[#8b97a8]">{label}</div>
      <div className="num mt-2 font-display text-2xl">{value}</div>
    </article>
  );
}
