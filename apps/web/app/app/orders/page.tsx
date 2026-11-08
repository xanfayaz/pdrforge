'use client';

import { ORDER_STATUS_LABEL } from '@pdrforge/shared';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, download } from '@/lib/api';
import { money, when } from '@/lib/format';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const orders = useQuery({
    queryKey: ['orders', status, q],
    queryFn: () => api<{ items: Order[]; total: number }>(`/orders?take=100${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Заявки</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => download('/export/orders.xlsx', 'pdrforge-orders.xlsx')}>
            Excel
          </Button>
          <Link href="/app/orders/new" className="inline-flex h-10 items-center rounded-lg bg-[#3c8dff] px-4 text-sm text-[#07101c]">
            Новая заявка
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={`rounded-full px-3 py-1 text-sm ${status === '' ? 'bg-white text-black' : 'bg-white/5'}`} onClick={() => setStatus('')}>
          Все
        </button>
        {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
          <button key={value} className={`rounded-full px-3 py-1 text-sm ${status === value ? 'bg-white text-black' : 'bg-white/5'}`} onClick={() => setStatus(value)}>
            {label}
          </button>
        ))}
        <Input className="w-full md:max-w-xs" placeholder="Номер, клиент, госномер, VIN" value={q} onChange={(event) => setQ(event.target.value)} />
      </div>
      <div className="grid gap-2 md:hidden">
        {(orders.data?.items || []).map((order) => (
          <Link key={order.id} href={`/app/orders/${order.id}`} className="panel block p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[#9ec4ff]">{order.number}</div>
                <div className="mt-1 text-sm">{order.client.name}</div>
                <div className="text-xs text-[#8b97a8]">
                  {when(order.scheduledAt)} · {order.vehicle.plate} · {order.vehicle.make} {order.vehicle.model}
                </div>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="num">{money(order.grandTotal)}</span>
              <span className={order.debt ? 'num text-[#ffb07a]' : 'num text-[#8b97a8]'}>долг {money(order.debt)}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="panel hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-[#8b97a8]">
            <tr>
              <th className="px-3 py-3">Номер</th>
              <th>Когда</th>
              <th>Клиент</th>
              <th>Авто</th>
              <th>Сумма</th>
              <th>Долг</th>
            </tr>
          </thead>
          <tbody>
            {(orders.data?.items || []).map((order) => (
              <tr key={order.id} className="border-t border-white/5">
                <td className="px-3 py-3">
                  <Link href={`/app/orders/${order.id}`} className="text-[#9ec4ff]">
                    {order.number}
                  </Link>
                  <div className="mt-1">
                    <StatusBadge status={order.status} />
                  </div>
                </td>
                <td>{when(order.scheduledAt)}</td>
                <td>{order.client.name}</td>
                <td>
                  {order.vehicle.plate}
                  <div className="text-xs text-[#8b97a8]">
                    {order.vehicle.make} {order.vehicle.model}
                  </div>
                </td>
                <td className="num">{money(order.grandTotal)}</td>
                <td className={`num ${order.debt ? 'text-[#ffb07a]' : ''}`}>{money(order.debt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
