'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { Analytics } from '@/lib/types';

export default function AnalyticsPage() {
  const qc = useQueryClient();
  const analytics = useQuery({ queryKey: ['analytics'], queryFn: () => api<Analytics>('/analytics') });
  const [category, setCategory] = useState('Материалы');
  const [amount, setAmount] = useState(1000);
  const data = analytics.data;
  const max = Math.max(...(data?.byDirection?.map((item) => item.amount) || [1]), 1);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl">Аналитика</h1>
      <section className="grid gap-3 md:grid-cols-4">
        <Card label="Начислено" value={money(data?.accrued)} />
        <Card label="Оплачено" value={money(data?.collected)} />
        <Card label="Средний чек" value={money(data?.averageCheck)} />
        <Card label="Прибыль кассы" value={money(data?.profit)} hint="оплачено минус расходы" />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-4">
          <h2 className="font-display text-xl">Доходы по направлениям</h2>
          <div className="mt-4 space-y-3">
            {(data?.byDirection || []).map((item) => (
              <div key={item.code}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="num">{money(item.amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5">
                  <div className="h-2 rounded-full bg-[#3c8dff]" style={{ width: `${(item.amount / max) * 100}%` }} />
                </div>
              </div>
            ))}
            {!data?.byDirection?.length ? <p className="text-sm text-[#8b97a8]">В этом месяце начислений нет.</p> : null}
          </div>
        </article>
        <article className="panel p-4">
          <h2 className="font-display text-xl">Загрузка</h2>
          <p className="mt-2 text-sm text-[#9aa6b5]">
            {data ? `${Math.round(data.busyMin / 60)} ч заявок / ${Math.round(data.capacityMin / 60)} ч ёмкости` : '…'}
          </p>
          <p className="text-xs text-[#8b97a8]">Ёмкость: активные владельцы и мастера × 8 часов × дни периода.</p>
          <div className="mt-4 h-3 rounded-full bg-white/5">
            <div
              className="h-3 rounded-full bg-[#ff7a2f]"
              style={{ width: `${Math.min(100, Math.round((data?.load || 0) * 100))}%` }}
            />
          </div>
          <div className="num mt-2 text-3xl">{data ? `${Math.round(data.load * 100)}%` : '—'}</div>
          <div className="mt-4 text-sm">Открытая дебиторка по всем заявкам: {money(data?.openDebt)}</div>
        </article>
      </section>
      <section className="panel p-4">
        <h2 className="font-display text-xl">Расходы</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data?.expenses || []).map((expense) => (
            <li key={expense.id} className="flex justify-between gap-3">
              <span>
                {expense.category}
                <span className="text-[#8b97a8]"> · {expense.note}</span>
              </span>
              <span>
                {money(expense.amount)}{' '}
                <button
                  className="text-[#ffb4a2]"
                  onClick={async () => {
                    await api(`/expenses/${expense.id}`, { method: 'DELETE' });
                    qc.invalidateQueries({ queryKey: ['analytics'] });
                  }}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input className="max-w-xs" value={category} onChange={(event) => setCategory(event.target.value)} />
          <Input className="w-32" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
          <Button
            onClick={async () => {
              await api('/expenses', { method: 'POST', body: JSON.stringify({ category, amount }) });
              qc.invalidateQueries({ queryKey: ['analytics'] });
            }}
          >
            Добавить расход
          </Button>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="panel p-4">
      <div className="text-xs uppercase tracking-wide text-[#8b97a8]">{label}</div>
      <div className="num mt-2 font-display text-2xl">{value}</div>
      {hint ? <div className="text-xs text-[#8b97a8]">{hint}</div> : null}
    </article>
  );
}
