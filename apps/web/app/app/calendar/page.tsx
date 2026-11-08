'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { dayLabel, startOfWeek, when } from '@/lib/format';
import type { Order } from '@/lib/types';

const hours = Array.from({ length: 13 }, (_, index) => index + 8);

function todayIndex() {
  const now = new Date();
  const start = startOfWeek(now);
  const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - start.getTime()) / 86_400_000);
  return Math.min(6, Math.max(0, diff));
}

function atHour(day: Date, hour: number) {
  const slot = new Date(day);
  slot.setHours(hour, 0, 0, 0);
  return slot.toISOString();
}

function whenTime(value?: string | null) {
  return when(value).split(', ').pop() || when(value);
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => startOfWeek());
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + index)), [cursor]);
  const from = days[0].toISOString();
  const end = new Date(days[6]);
  end.setHours(23, 59, 59, 999);
  const orders = useQuery({
    queryKey: ['calendar', from],
    queryFn: () => api<{ items: Order[] }>(`/orders?from=${from}&to=${end.toISOString()}&take=200`),
  });

  const [selected, setSelected] = useState(() => todayIndex());
  const day = days[selected] || days[0];
  const dayOrders = (orders.data?.items || [])
    .filter((order) => order.scheduledAt && new Date(order.scheduledAt).toDateString() === day.toDateString())
    .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime());

  function shiftDay(step: number) {
    const next = selected + step;
    if (next < 0) {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7));
      setSelected(6);
      return;
    }
    if (next > 6) {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7));
      setSelected(0);
      return;
    }
    setSelected(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl">Календарь</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7))}>
            Назад
          </Button>
          <Button variant="outline" onClick={() => setCursor(startOfWeek())}>
            Эта неделя
          </Button>
          <Button variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7))}>
            Дальше
          </Button>
        </div>
      </div>
      <section className="space-y-3 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" className="h-11 w-11 shrink-0 px-0" aria-label="Предыдущий день" onClick={() => shiftDay(-1)}>
            ←
          </Button>
          <div className="text-center text-sm">
            {day.toLocaleDateString('ru-RU', { weekday: 'long' })}
            <div className="text-[#8b97a8]">{dayLabel(day)}</div>
          </div>
          <Button variant="outline" className="h-11 w-11 shrink-0 px-0" aria-label="Следующий день" onClick={() => shiftDay(1)}>
            →
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((item, index) => (
            <button
              key={item.toISOString()}
              type="button"
              onClick={() => setSelected(index)}
              className={`rounded-xl px-1 py-2 text-center text-[11px] ${index === selected ? 'bg-[#3c8dff] text-[#07101c]' : 'bg-white/5'}`}
            >
              {item.toLocaleDateString('ru-RU', { weekday: 'narrow' })}
              <div>{item.getDate()}</div>
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {dayOrders.map((order) => (
            <Link key={order.id} href={`/app/orders/${order.id}`} className="panel block p-3">
              <div className="text-sm text-[#9ec4ff]">{whenTime(order.scheduledAt)} · {order.number}</div>
              <div className="mt-1">{order.client.name}</div>
              <div className="text-xs text-[#8b97a8]">
                {order.vehicle.plate} · {order.durationMin} мин · {order.assignee?.name || 'без мастера'}
              </div>
            </Link>
          ))}
          {!dayOrders.length ? <p className="text-sm text-[#8b97a8]">На этот день записей нет.</p> : null}
        </div>
        <Link
          href={`/app/orders/new?at=${atHour(day, 9)}`}
          className="inline-flex h-11 items-center rounded-lg bg-[#3c8dff] px-4 text-sm text-[#07101c]"
        >
          Записать на 9:00
        </Link>
      </section>
      <div className="panel hidden overflow-x-auto p-3 md:block">
        <div className="grid min-w-[860px] grid-cols-[48px_repeat(7,1fr)] gap-2">
          <div />
          {days.map((day) => (
            <div key={day.toISOString()} className="text-center text-sm">
              {day.toLocaleDateString('ru-RU', { weekday: 'short' })}
              <div className="text-[#8b97a8]">{dayLabel(day)}</div>
            </div>
          ))}
          <div className="relative h-[640px]">
            {hours.map((hour, index) => (
              <div key={hour} className="absolute left-0 text-[10px] text-[#8b97a8]" style={{ top: `${(index / 12) * 100}%` }}>
                {hour}:00
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day.toISOString()} className="relative h-[640px] rounded-xl bg-black/20">
              {hours.map((hour) => {
                const slot = new Date(day);
                slot.setHours(hour, 0, 0, 0);
                return (
                  <Link
                    key={hour}
                    href={`/app/orders/new?at=${slot.toISOString()}`}
                    className="absolute inset-x-0 block border-t border-white/5"
                    style={{ top: `${((hour - 8) / 12) * 100}%`, height: `${100 / 12}%` }}
                  />
                );
              })}
              {(orders.data?.items || [])
                .filter((order) => order.scheduledAt && new Date(order.scheduledAt).toDateString() === day.toDateString())
                .map((order) => {
                  const start = new Date(order.scheduledAt as string);
                  const minutes = start.getHours() * 60 + start.getMinutes();
                  const top = ((minutes - 8 * 60) / (12 * 60)) * 100;
                  const height = Math.max(8, (order.durationMin / (12 * 60)) * 100);
                  return (
                    <Link
                      key={order.id}
                      href={`/app/orders/${order.id}`}
                      className="absolute inset-x-1 z-10 overflow-hidden rounded-lg px-2 py-1 text-[11px] text-black"
                      style={{
                        top: `${Math.max(0, top)}%`,
                        height: `${height}%`,
                        background: order.assignee?.color || '#3c8dff',
                      }}
                    >
                      <div className="font-medium">{order.number}</div>
                      <div>{order.client.name}</div>
                    </Link>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
