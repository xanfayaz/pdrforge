'use client';

import { ORDER_STATUS_LABEL, PAY_METHOD_LABEL, panelName } from '@pdrforge/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { CarDiagram } from '@/components/car-diagram';
import { ConstructorPanel } from '@/components/constructor-panel';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, download, media } from '@/lib/api';
import { money, toLocalInput, when } from '@/lib/format';
import type { Employee, Order, ServiceItem, Workshop } from '@/lib/types';

export function OrderEditor({ id }: { id: string }) {
  const qc = useQueryClient();
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api<Order>(`/orders/${id}`) });
  const workshop = useQuery({ queryKey: ['workshop'], queryFn: () => api<Workshop>('/workshop') });
  const services = useQuery({ queryKey: ['services'], queryFn: () => api<ServiceItem[]>('/catalog/services') });
  const team = useQuery({ queryKey: ['team'], queryFn: () => api<Employee[]>('/team') });
  const [panel, setPanel] = useState<string>('hood');
  const [direction, setDirection] = useState('pdr');
  const [serviceId, setServiceId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customPrice, setCustomPrice] = useState(2500);
  const [openCalc, setOpenCalc] = useState(false);
  const [payAmount, setPayAmount] = useState(1000);
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'transfer'>('card');
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    try {
      await api(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      qc.invalidateQueries({ queryKey: ['order', id] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не сохранилось');
    }
  }

  async function addService() {
    const service = services.data?.find((item) => item.id === serviceId);
    if (!service) return;
    await api(`/orders/${id}/lines`, {
      method: 'POST',
      body: JSON.stringify({
        directionCode: service.directionCode,
        kind: service.isComplex ? 'complex' : 'service',
        serviceId: service.id,
        panelCode: panel,
        qty: 1,
      }),
    });
    qc.invalidateQueries({ queryKey: ['order', id] });
  }

  async function addCustom() {
    if (customTitle.trim().length < 2) return;
    await api(`/orders/${id}/lines`, {
      method: 'POST',
      body: JSON.stringify({
        directionCode: direction,
        kind: 'custom',
        title: customTitle,
        unitPrice: customPrice,
        panelCode: panel,
        qty: 1,
      }),
    });
    setCustomTitle('');
    qc.invalidateQueries({ queryKey: ['order', id] });
  }

  const removeLine = useMutation({
    mutationFn: (lineId: string) => api(`/orders/${id}/lines/${lineId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
  });

  if (order.isLoading) return <p className="text-[#8b97a8]">Открываю заявку…</p>;
  if (!order.data) return <p>Заявка не найдена</p>;
  const data = order.data;
  const directions = workshop.data?.directions.filter((item) => item.enabled) || [];
  const filtered = (services.data || []).filter((item) => item.directionCode === direction && item.active);
  const marked = [...new Set(data.lines.map((line) => line.panelCode).filter(Boolean) as string[])];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl">{data.number}</h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="mt-1 text-sm text-[#9aa6b5]">
            <Link className="text-[#9ec4ff]" href={`/app/clients/${data.client.id}`}>
              {data.client.name}
            </Link>
            {' · '}
            <Link className="text-[#9ec4ff]" href={`/app/vehicles/${data.vehicle.id}`}>
              {data.vehicle.make} {data.vehicle.model} · {data.vehicle.plate}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => download(`/documents/orders/${id}/work-order.pdf`, `${data.number}-zakaz.pdf`)}>
            Заказ-наряд PDF
          </Button>
          <Button variant="outline" onClick={() => download(`/documents/orders/${id}/act.pdf`, `${data.number}-akt.pdf`)}>
            Акт PDF
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm('Удалить заявку?')) return;
              await api(`/orders/${id}`, { method: 'DELETE' });
              window.location.href = '/app/orders';
            }}
          >
            Удалить
          </Button>
        </div>
      </div>
      {error ? <p className="text-sm text-[#ffb4a2]">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <section className="panel p-4">
          <CarDiagram selected={panel} marked={marked} onSelect={setPanel} />
        </section>
        <div className="space-y-4">
          <section className="panel grid gap-3 p-4 md:grid-cols-4">
            <label className="text-xs text-[#8b97a8]">
              Статус
              <Select className="mt-1" value={data.status} onChange={(event) => patch({ status: event.target.value })}>
                {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-xs text-[#8b97a8]">
              Дата и время
              <Input
                className="mt-1"
                type="datetime-local"
                defaultValue={toLocalInput(data.scheduledAt)}
                onBlur={(event) => patch({ scheduledAt: event.target.value ? new Date(event.target.value).toISOString() : null })}
              />
            </label>
            <label className="text-xs text-[#8b97a8]">
              Длительность, мин
              <Input
                className="mt-1"
                type="number"
                defaultValue={data.durationMin}
                onBlur={(event) => patch({ durationMin: Number(event.target.value) })}
              />
            </label>
            <label className="text-xs text-[#8b97a8]">
              Мастер
              <Select
                className="mt-1"
                value={data.assignee?.id || ''}
                onChange={(event) => patch({ assigneeId: event.target.value || null })}
              >
                <option value="">Не назначен</option>
                {(team.data || [])
                  .filter((person) => person.active)
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} · {person.title || person.role}
                    </option>
                  ))}
              </Select>
            </label>
            <label className="text-xs text-[#8b97a8]">
              Пробег на визите
              <Input
                className="mt-1"
                type="number"
                defaultValue={data.mileageAt ?? data.vehicle.mileage}
                onBlur={(event) => patch({ mileageAt: Number(event.target.value) })}
              />
            </label>
            <label className="text-xs text-[#8b97a8]">
              Выезд, км
              <Input
                className="mt-1"
                type="number"
                defaultValue={data.travelKm}
                onBlur={(event) => patch({ travelEnabled: Number(event.target.value) > 0 || data.travelEnabled, travelKm: Number(event.target.value) })}
              />
            </label>
            <label className="flex items-end gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={data.travelEnabled}
                onChange={(event) => patch({ travelEnabled: event.target.checked })}
              />
              Считать выезд ({money(data.travelFee)})
            </label>
            <label className="text-xs text-[#8b97a8] md:col-span-4">
              Комментарий
              <Textarea className="mt-1" defaultValue={data.notes} onBlur={(event) => patch({ notes: event.target.value })} />
            </label>
          </section>

          <section className="panel p-4">
            <div className="text-sm text-[#9ec4ff]">Добавить на: {panelName(panel)}</div>
            <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto_auto]">
              <Select
                value={direction}
                onChange={(event) => {
                  setDirection(event.target.value);
                  setServiceId('');
                }}
              >
                {directions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <Select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                <option value="">Услуга из каталога</option>
                {filtered.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.isComplex ? 'Комплекс · ' : ''}
                    {item.name} · {money(item.price)}
                  </option>
                ))}
              </Select>
              <Button variant="outline" onClick={addService} disabled={!serviceId}>
                Добавить
              </Button>
              {direction === 'pdr' ? (
                <Button variant="accent" onClick={() => setOpenCalc(true)}>
                  Конструктор
                </Button>
              ) : (
                <span />
              )}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_140px_auto]">
              <Input placeholder="Своя работа" value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} />
              <Input type="number" value={customPrice} onChange={(event) => setCustomPrice(Number(event.target.value))} />
              <Button variant="outline" onClick={addCustom}>
                Своя цена
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            {data.lines.map((line) => (
              <article key={line.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#8b97a8]">
                      {line.kind === 'complex' ? 'Комплекс' : line.kind === 'pdr' ? 'PDR' : line.kind === 'armature' ? 'Арматура' : 'Работа'}
                      {line.panelName ? ` · ${line.panelName}` : ''}
                    </div>
                    <h3 className="mt-1 text-lg">{line.title}</h3>
                    {line.description ? <p className="text-sm text-[#9aa6b5]">{line.description}</p> : null}
                  </div>
                  <div className="text-right">
                    <div className="num text-xl">{money(line.total)}</div>
                    <div className="text-xs text-[#8b97a8]">
                      {line.qty} × {money(line.unitPrice)}
                    </div>
                    <button className="mt-1 text-xs text-[#ffb4a2]" onClick={() => removeLine.mutate(line.id)}>
                      Удалить
                    </button>
                  </div>
                </div>
                {line.snapshot?.breakdown?.formulaLines ? (
                  <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-[#c5ceda]">
                    {line.snapshot.breakdown.formulaLines.join('\n')}
                  </pre>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-3">
                  <PhotoPile id={id} lineId={line.id} phase="before" photos={line.photos || []} />
                  <PhotoPile id={id} lineId={line.id} phase="after" photos={line.photos || []} />
                </div>
              </article>
            ))}
            {!data.lines.length ? <p className="text-sm text-[#8b97a8]">В заявке пока нет работ.</p> : null}
          </section>

          <section className="panel grid gap-4 p-4 md:grid-cols-[1fr_220px]">
            <div>
              <h3 className="font-display text-lg">Оплаты</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {data.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between gap-3">
                    <span>
                      {when(payment.paidAt)} · {PAY_METHOD_LABEL[payment.method]}
                    </span>
                    <span>
                      {money(payment.amount)}{' '}
                      <button
                        className="text-[#ffb4a2]"
                        onClick={async () => {
                          await api(`/orders/${id}/payments/${payment.id}`, { method: 'DELETE' });
                          qc.invalidateQueries({ queryKey: ['order', id] });
                        }}
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Input className="w-28" type="number" value={payAmount} onChange={(event) => setPayAmount(Number(event.target.value))} />
                <Select className="w-36" value={payMethod} onChange={(event) => setPayMethod(event.target.value as 'cash' | 'card' | 'transfer')}>
                  {Object.entries(PAY_METHOD_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Button
                  onClick={async () => {
                    await api(`/orders/${id}/payments`, {
                      method: 'POST',
                      body: JSON.stringify({ amount: payAmount, method: payMethod }),
                    });
                    qc.invalidateQueries({ queryKey: ['order', id] });
                  }}
                >
                  Принять оплату
                </Button>
              </div>
            </div>
            <dl className="space-y-1 text-sm">
              <MoneyRow k="Работы" v={data.laborTotal} />
              {data.minLift > 0 ? <MoneyRow k="До минимального заказа" v={data.minLift} /> : null}
              {data.travelFee > 0 ? <MoneyRow k="Выезд" v={data.travelFee} /> : null}
              <MoneyRow k="Итого" v={data.grandTotal} strong />
              <MoneyRow k="Оплачено" v={data.paid} />
              <MoneyRow k="Долг" v={data.debt} strong />
            </dl>
          </section>
        </div>
      </div>

      <Dialog open={openCalc} onOpenChange={setOpenCalc}>
        <DialogContent className="w-[min(1040px,calc(100%-1.5rem))]">
          <DialogTitle>Конструктор повреждений</DialogTitle>
          <div className="mt-4">
            <ConstructorPanel
              orderId={id}
              panelCode={panel}
              panelName={panelName(panel)}
              carClass={data.vehicle.carClass}
              onAdded={() => setOpenCalc(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MoneyRow({ k, v, strong }: { k: string; v: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-display text-lg' : ''}`}>
      <dt>{k}</dt>
      <dd className={`num ${k === 'Долг' && v > 0 ? 'text-[#ffb07a]' : ''}`}>{money(v)}</dd>
    </div>
  );
}

function PhotoPile({
  id,
  lineId,
  phase,
  photos,
}: {
  id: string;
  lineId: string;
  phase: 'before' | 'after';
  photos: { id: string; phase: string; url: string }[];
}) {
  const qc = useQueryClient();
  const items = photos.filter((photo) => photo.phase === phase);
  return (
    <div>
      <div className="text-xs text-[#8b97a8]">{phase === 'before' ? 'До' : 'После'}</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {items.map((photo) => (
          <button
            key={photo.id}
            onClick={async () => {
              await api(`/photos/${photo.id}`, { method: 'DELETE' });
              qc.invalidateQueries({ queryKey: ['order', id] });
            }}
          >
            <img src={media(photo.url)} alt="" className="h-16 w-24 rounded-md border border-white/10 object-cover" />
          </button>
        ))}
        <label className="grid h-16 w-24 cursor-pointer place-items-center rounded-md border border-dashed border-white/15 text-xs text-[#8b97a8]">
          Фото
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const body = new FormData();
              body.append('file', file);
              await api(`/orders/${id}/lines/${lineId}/photos?phase=${phase}`, { method: 'POST', body });
              qc.invalidateQueries({ queryKey: ['order', id] });
            }}
          />
        </label>
      </div>
    </div>
  );
}
