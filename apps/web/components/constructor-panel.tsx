'use client';

import { interpolateControlPoints } from '@pdrforge/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { ConstructorSettings, PdrForm, Quote } from '@/lib/types';

const groupTitle: Record<string, string> = {
  hail: 'Град',
  complexity: 'Сложность',
  material: 'Материал',
  carClass: 'Класс авто',
  coating: 'Покрытие',
};

export function ConstructorPanel({
  orderId,
  panelCode,
  panelName,
  carClass,
  onAdded,
}: {
  orderId?: string;
  panelCode?: string | null;
  panelName?: string | null;
  carClass?: string;
  onAdded?: () => void;
}) {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ['constructor'],
    queryFn: () => api<ConstructorSettings>('/constructor/settings'),
  });
  const [shape, setShape] = useState<PdrForm['shape']>('circle');
  const [diameter, setDiameter] = useState(30);
  const [width, setWidth] = useState(40);
  const [height, setHeight] = useState(28);
  const [length, setLength] = useState(300);
  const [count, setCount] = useState(1);
  const [hailKey, setHail] = useState('none');
  const [complexityKey, setComplexity] = useState('standard');
  const [materialKey, setMaterial] = useState('steel');
  const [carClassKey, setCarClass] = useState(carClass || 'b');
  const [coatingKey, setCoating] = useState('factory');
  const [adjust, setAdjust] = useState(0);
  const [armatureIds, setArmatureIds] = useState<string[]>([]);
  const [travelEnabled, setTravel] = useState(false);
  const [travelKm, setKm] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (carClass) setCarClass(carClass);
  }, [carClass]);

  const payload = useMemo<PdrForm>(
    () => ({
      shape,
      diameterMm: diameter,
      widthMm: width,
      heightMm: height,
      lengthMm: length,
      count,
      hailKey,
      complexityKey,
      materialKey,
      carClassKey,
      coatingKey,
      adjustPercent: settings.data?.canAdjust ? adjust : 0,
    }),
    [shape, diameter, width, height, length, count, hailKey, complexityKey, materialKey, carClassKey, coatingKey, adjust, settings.data?.canAdjust],
  );

  useEffect(() => {
    if (!settings.data) return;
    const timer = setTimeout(() => {
      api<Quote>('/constructor/calculate', {
        method: 'POST',
        body: JSON.stringify({
          pdr: payload,
          panelName: panelName || 'Элемент',
          armatureIds,
          travelEnabled,
          travelKm,
        }),
      })
        .then((result) => {
          setQuote(result);
          setError(null);
        })
        .catch((reason: Error) => setError(reason.message));
    }, 180);
    return () => clearTimeout(timer);
  }, [payload, armatureIds, travelEnabled, travelKm, panelName, settings.data]);

  const add = useMutation({
    mutationFn: () =>
      api(`/orders/${orderId}/constructor`, {
        method: 'POST',
        body: JSON.stringify({
          panelCode: panelCode || 'whole',
          pdr: payload,
          armatureIds,
          travelEnabled,
          travelKm,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      onAdded?.();
    },
  });

  if (!settings.data) return <p className="text-sm text-[#8b97a8]">Загружаю шкалу цен…</p>;
  const { policy, canAdjust } = settings.data;
  const groups = ['complexity', 'material', 'carClass', 'coating', 'hail'];
  const activeDiameter = shape === 'circle' ? diameter : shape === 'oval' ? Math.sqrt(width * height) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['circle', 'Круг'],
              ['oval', 'Овал'],
              ['stripe', 'Полоса'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setShape(value)}
              className={`rounded-full px-3 py-1 text-sm ${shape === value ? 'bg-[#3c8dff] text-[#07101c]' : 'bg-white/5'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {shape === 'circle' ? (
            <Field label="Диаметр, мм">
              <Input type="number" value={diameter} onChange={(event) => setDiameter(Number(event.target.value))} />
            </Field>
          ) : null}
          {shape !== 'circle' ? (
            <Field label="Ширина, мм">
              <Input type="number" value={width} onChange={(event) => setWidth(Number(event.target.value))} />
            </Field>
          ) : null}
          {shape === 'oval' ? (
            <Field label="Высота, мм">
              <Input type="number" value={height} onChange={(event) => setHeight(Number(event.target.value))} />
            </Field>
          ) : null}
          {shape === 'stripe' ? (
            <Field label="Длина, мм">
              <Input type="number" value={length} onChange={(event) => setLength(Number(event.target.value))} />
            </Field>
          ) : null}
          <Field label="Количество">
            <Input type="number" min={1} value={count} onChange={(event) => setCount(Number(event.target.value))} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <Field key={group} label={groupTitle[group]}>
              <Select
                value={{ hail: hailKey, complexity: complexityKey, material: materialKey, carClass: carClassKey, coating: coatingKey }[group]}
                onChange={(event) => {
                  const value = event.target.value;
                  if (group === 'hail') setHail(value);
                  if (group === 'complexity') setComplexity(value);
                  if (group === 'material') setMaterial(value);
                  if (group === 'carClass') setCarClass(value);
                  if (group === 'coating') setCoating(value);
                }}
              >
                {settings.data.coefficients
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label} × {item.multiplier}
                    </option>
                  ))}
              </Select>
            </Field>
          ))}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Быстрая корректировка</span>
            <span className="num text-[#ffb07a]">
              {adjust > 0 ? '+' : ''}
              {canAdjust ? adjust : 0}%
            </span>
          </div>
          <Slider
            min={policy.adjustMin}
            max={policy.adjustMax}
            step={policy.adjustStep}
            value={[canAdjust ? adjust : 0]}
            disabled={!canAdjust}
            onValueChange={([value]) => setAdjust(value)}
          />
          <p className="mt-1 text-xs text-[#8b97a8]">
            {policy.adjustMin}% … {policy.adjustMax}%, шаг {policy.adjustStep}.{' '}
            {canAdjust ? 'Ползунок доступен.' : 'Для мастеров ползунок закрыт владельцем.'}
          </p>
        </div>
        <div className="space-y-2">
          <div className="text-sm">Арматурные работы</div>
          {settings.data.armature
            .filter((item) => item.active)
            .map((item) => (
              <label key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={armatureIds.includes(item.id)}
                    onChange={(event) =>
                      setArmatureIds((current) =>
                        event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                      )
                    }
                  />
                  {item.name}
                </span>
                <span className="num text-[#c5ceda]">{money(item.price)}</span>
              </label>
            ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm">Выезд мастера</div>
            <div className="text-xs text-[#8b97a8]">
              {money(policy.travelBaseFee)} + {money(policy.travelPerKm)} / км
            </div>
          </div>
          <Switch checked={travelEnabled} onCheckedChange={setTravel} />
        </div>
        {travelEnabled ? (
          <Field label="Километры">
            <Input type="number" min={0} value={travelKm} onChange={(event) => setKm(Number(event.target.value))} />
          </Field>
        ) : null}
      </div>
      <div className="panel p-4">
        <div className="text-xs uppercase tracking-[0.16em] text-[#8b97a8]">{panelName || 'Песочница'}</div>
        {shape !== 'stripe' ? <Curve points={settings.data.controlPoints} diameter={activeDiameter} /> : <MatrixHeat matrix={settings.data.matrix} width={width} length={length} />}
        <div className="mt-3 space-y-1 font-mono text-xs leading-5 text-[#d5deea]">
          {quote?.pdr.formulaLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        {quote ? (
          <dl className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
            <Total k="Арматура" v={quote.armatureTotal} />
            <Total k="Выезд" v={quote.travelFee} />
            <div className="flex justify-between font-display text-2xl">
              <dt>Итого</dt>
              <dd className="num text-[#ffb07a]">{money(quote.grandTotal)}</dd>
            </div>
          </dl>
        ) : null}
        {error ? <p className="mt-3 text-sm text-[#ffb4a2]">{error}</p> : null}
        {orderId ? (
          <Button className="mt-4 w-full" variant="accent" disabled={add.isPending || !quote} onClick={() => add.mutate()}>
            Добавить в заявку
          </Button>
        ) : (
          <p className="mt-4 text-xs text-[#8b97a8]">Чтобы записать расчёт, откройте конструктор из заявки.</p>
        )}
        {add.error ? <p className="mt-2 text-sm text-[#ffb4a2]">{(add.error as Error).message}</p> : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs text-[#8b97a8]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Total({ k, v }: { k: string; v: number }) {
  if (!v) return null;
  return (
    <div className="flex justify-between">
      <dt>{k}</dt>
      <dd className="num">{money(v)}</dd>
    </div>
  );
}

function Curve({ points, diameter }: { points: { diameterMm: number; price: number }[]; diameter: number | null }) {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.diameterMm - b.diameterMm);
  const minD = sorted[0].diameterMm;
  const maxD = sorted[sorted.length - 1].diameterMm;
  const maxP = Math.max(...sorted.map((point) => point.price), 1);
  const samples = Array.from({ length: 28 }, (_, index) => {
    const d = minD + ((maxD - minD) * index) / 27;
    return { d, p: interpolateControlPoints(sorted, d).price };
  });
  const x = (d: number) => 16 + ((d - minD) / (maxD - minD || 1)) * 250;
  const y = (p: number) => 118 - (p / maxP) * 96;
  const d = samples.map((sample, index) => `${index ? 'L' : 'M'} ${x(sample.d).toFixed(1)} ${y(sample.p).toFixed(1)}`).join(' ');
  return (
    <svg viewBox="0 0 280 140" className="mt-2 w-full">
      <path d={d} fill="none" stroke="#3c8dff" strokeWidth="2" />
      {sorted.map((point) => (
        <circle key={point.diameterMm} cx={x(point.diameterMm)} cy={y(point.price)} r="2.5" fill="#ff7a2f" />
      ))}
      {diameter ? <circle cx={x(Math.min(maxD, Math.max(minD, diameter)))} cy={y(interpolateControlPoints(sorted, diameter).price)} r="4" fill="#ffffff" /> : null}
    </svg>
  );
}

function MatrixHeat({
  matrix,
  width,
  length,
}: {
  matrix: { widths: number[]; lengths: number[]; prices: number[][] };
  width: number;
  length: number;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr>
            <th />
            {matrix.lengths.map((value) => (
              <th key={value} className="px-1 text-[#8b97a8]">
                {value}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.widths.map((rowWidth, row) => (
            <tr key={rowWidth}>
              <td className="pr-1 text-[#8b97a8]">{rowWidth}</td>
              {matrix.lengths.map((colLength, col) => {
                const hot =
                  Math.abs(rowWidth - width) <= (matrix.widths[1] - matrix.widths[0]) / 2 &&
                  Math.abs(colLength - length) <= (matrix.lengths[1] - matrix.lengths[0]) / 2;
                return (
                  <td key={colLength} className={`px-1 py-1 text-right ${hot ? 'bg-[#3c8dff]/30 text-white' : 'text-[#c5ceda]'}`}>
                    {matrix.prices[row]?.[col]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
