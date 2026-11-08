'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { ConstructorSettings } from '@/lib/types';

export function PricingSettings({ settings }: { settings: ConstructorSettings }) {
  return (
    <div className="space-y-8">
      <PointsEditor settings={settings} />
      <CoefficientsEditor settings={settings} />
      <MatrixEditor settings={settings} />
      <PolicyEditor settings={settings} />
      <ArmatureEditor settings={settings} />
    </div>
  );
}

function PointsEditor({ settings }: { settings: ConstructorSettings }) {
  const [points, setPoints] = useState(settings.controlPoints.map((point) => ({ diameterMm: point.diameterMm, price: point.price })));
  const save = useSave('Точки сохранены');
  return (
    <section className="panel p-4">
      <h3 className="font-display text-lg">Контрольные точки</h3>
      <p className="mt-1 text-sm text-[#8b97a8]">Диаметр в миллиметрах переходит в цену плавной интерполяцией между соседними точками.</p>
      <div className="mt-3 space-y-2">
        {points.map((point, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input type="number" value={point.diameterMm} onChange={(event) => update(index, 'diameterMm', Number(event.target.value))} />
            <Input type="number" value={point.price} onChange={(event) => update(index, 'price', Number(event.target.value))} />
            <Button variant="ghost" onClick={() => setPoints(points.filter((_, item) => item !== index))}>
              Убрать
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" onClick={() => setPoints([...points, { diameterMm: 10, price: 1000 }])}>
          Точка
        </Button>
        <Button onClick={() => save.mutate(() => api('/constructor/control-points', { method: 'PUT', body: JSON.stringify({ points }) }))}>
          Сохранить точки
        </Button>
      </div>
      {save.isSuccess ? <p className="mt-2 text-sm text-[#8ee0bf]">Сохранено</p> : null}
      {save.error ? <p className="mt-2 text-sm text-[#ffb4a2]">{(save.error as Error).message}</p> : null}
    </section>
  );

  function update(index: number, key: 'diameterMm' | 'price', value: number) {
    setPoints(points.map((point, item) => (item === index ? { ...point, [key]: value } : point)));
  }
}

function CoefficientsEditor({ settings }: { settings: ConstructorSettings }) {
  const [items, setItems] = useState(settings.coefficients);
  const save = useSave('coef');
  return (
    <section className="panel p-4">
      <h3 className="font-display text-lg">Коэффициенты</h3>
      <div className="mt-3 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.group}-${item.key}`} className="grid grid-cols-[120px_1fr_100px] items-center gap-2 text-sm">
            <span className="text-[#8b97a8]">{item.group}</span>
            <Input value={item.label} onChange={(event) => setItems(items.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)))} />
            <Input
              type="number"
              step="0.05"
              value={item.multiplier}
              onChange={(event) =>
                setItems(items.map((row, i) => (i === index ? { ...row, multiplier: Number(event.target.value) } : row)))
              }
            />
          </div>
        ))}
      </div>
      <Button className="mt-3" onClick={() => save.mutate(() => api('/constructor/coefficients', { method: 'PUT', body: JSON.stringify({ items }) }))}>
        Сохранить коэффициенты
      </Button>
      {save.error ? <p className="mt-2 text-sm text-[#ffb4a2]">{(save.error as Error).message}</p> : null}
    </section>
  );
}

function MatrixEditor({ settings }: { settings: ConstructorSettings }) {
  const [matrix, setMatrix] = useState(settings.matrix);
  const save = useSave('matrix');
  return (
    <section className="panel overflow-x-auto p-4">
      <h3 className="font-display text-lg">Матрица площади полосы</h3>
      <p className="mt-1 text-sm text-[#8b97a8]">Строки — ширина, столбцы — длина. Между ячейками цена берётся билинейно.</p>
      <table className="mt-3 text-xs">
        <thead>
          <tr>
            <th />
            {matrix.lengths.map((value, col) => (
              <th key={col}>
                <Input className="h-8 w-16" type="number" value={value} onChange={(event) => setLength(col, Number(event.target.value))} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.widths.map((value, row) => (
            <tr key={row}>
              <td>
                <Input className="h-8 w-16" type="number" value={value} onChange={(event) => setWidth(row, Number(event.target.value))} />
              </td>
              {matrix.lengths.map((_, col) => (
                <td key={col}>
                  <Input
                    className="h-8 w-20"
                    type="number"
                    value={matrix.prices[row][col]}
                    onChange={(event) => setPrice(row, col, Number(event.target.value))}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Button className="mt-3" onClick={() => save.mutate(() => api('/constructor/matrix', { method: 'PUT', body: JSON.stringify(matrix) }))}>
        Сохранить матрицу
      </Button>
      {save.error ? <p className="mt-2 text-sm text-[#ffb4a2]">{(save.error as Error).message}</p> : null}
    </section>
  );

  function setWidth(row: number, value: number) {
    const widths = [...matrix.widths];
    widths[row] = value;
    setMatrix({ ...matrix, widths });
  }
  function setLength(col: number, value: number) {
    const lengths = [...matrix.lengths];
    lengths[col] = value;
    setMatrix({ ...matrix, lengths });
  }
  function setPrice(row: number, col: number, value: number) {
    const prices = matrix.prices.map((line) => [...line]);
    prices[row][col] = value;
    setMatrix({ ...matrix, prices });
  }
}

function PolicyEditor({ settings }: { settings: ConstructorSettings }) {
  const [policy, setPolicy] = useState(settings.policy);
  const save = useSave('policy');
  return (
    <section className="panel p-4">
      <h3 className="font-display text-lg">Выезд, округление и ползунок</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Label text="Выезд, база ₽">
          <Input type="number" value={policy.travelBaseFee} onChange={(event) => setPolicy({ ...policy, travelBaseFee: Number(event.target.value) })} />
        </Label>
        <Label text="Выезд, ₽/км">
          <Input type="number" value={policy.travelPerKm} onChange={(event) => setPolicy({ ...policy, travelPerKm: Number(event.target.value) })} />
        </Label>
        <Label text="Мин. заказ, ₽">
          <Input type="number" value={policy.minOrder} onChange={(event) => setPolicy({ ...policy, minOrder: Number(event.target.value) })} />
        </Label>
        <Label text="Округление">
          <Input type="number" value={policy.priceRoundTo} onChange={(event) => setPolicy({ ...policy, priceRoundTo: Number(event.target.value) })} />
        </Label>
        <Label text="Ползунок от, %">
          <Input type="number" value={policy.adjustMin} onChange={(event) => setPolicy({ ...policy, adjustMin: Number(event.target.value) })} />
        </Label>
        <Label text="Ползунок до, %">
          <Input type="number" value={policy.adjustMax} onChange={(event) => setPolicy({ ...policy, adjustMax: Number(event.target.value) })} />
        </Label>
        <Label text="Шаг, %">
          <Input type="number" value={policy.adjustStep} onChange={(event) => setPolicy({ ...policy, adjustStep: Number(event.target.value) })} />
        </Label>
      </div>
      <label className="mt-4 flex items-center justify-between text-sm">
        Мастера могут двигать ползунок
        <Switch checked={policy.staffCanAdjust} onCheckedChange={(staffCanAdjust) => setPolicy({ ...policy, staffCanAdjust })} />
      </label>
      <Button className="mt-3" onClick={() => save.mutate(() => api('/constructor/policy', { method: 'PATCH', body: JSON.stringify(policy) }))}>
        Сохранить правила
      </Button>
      {save.error ? <p className="mt-2 text-sm text-[#ffb4a2]">{(save.error as Error).message}</p> : null}
    </section>
  );
}

function ArmatureEditor({ settings }: { settings: ConstructorSettings }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState(500);
  const create = useMutation({
    mutationFn: () => api('/constructor/armature', { method: 'POST', body: JSON.stringify({ name, price, minutes: 20 }) }),
    onSuccess: () => {
      setName('');
      qc.invalidateQueries({ queryKey: ['constructor'] });
    },
  });
  return (
    <section className="panel p-4">
      <h3 className="font-display text-lg">Каталог арматуры</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {settings.armature.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3">
            <span>
              {item.name} <span className="text-[#8b97a8]">{money(item.price)}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await api(`/constructor/armature/${item.id}`, { method: 'DELETE' });
                qc.invalidateQueries({ queryKey: ['constructor'] });
              }}
            >
              Удалить
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-[1fr_120px_auto] gap-2">
        <Input placeholder="Новая работа" value={name} onChange={(event) => setName(event.target.value)} />
        <Input type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} />
        <Button onClick={() => create.mutate()}>Добавить</Button>
      </div>
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs text-[#8b97a8]">
      <span>{text}</span>
      {children}
    </label>
  );
}

function useSave(_label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['constructor'] }),
  });
}
