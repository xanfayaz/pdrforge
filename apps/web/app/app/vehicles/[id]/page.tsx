'use client';

import { CAR_CLASS_LABEL } from '@pdrforge/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { History } from '@/components/history';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { Order, Vehicle } from '@/lib/types';

export default function VehiclePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const vehicle = useQuery({ queryKey: ['vehicle', id], queryFn: () => api<Vehicle>(`/vehicles/${id}`) });
  const history = useQuery({ queryKey: ['vehicle-history', id], queryFn: () => api<Order[]>(`/vehicles/${id}/history`) });
  if (!vehicle.data) return <p className="text-[#8b97a8]">Автомобиль…</p>;
  const data = vehicle.data;

  async function save(patch: Partial<Vehicle>) {
    await api(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify({ ...data, ...patch }) });
    qc.invalidateQueries({ queryKey: ['vehicle', id] });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl">
          {data.make} {data.model}
        </h1>
        <p className="text-sm text-[#8b97a8]">
          Клиент:{' '}
          <Link className="text-[#9ec4ff]" href={`/app/clients/${data.clientId}`}>
            {data.client?.name || 'карточка'}
          </Link>
        </p>
      </div>
      <section className="panel grid gap-3 p-4 md:grid-cols-3">
        <Input defaultValue={data.plate} onBlur={(event) => save({ plate: event.target.value })} />
        <Input defaultValue={data.vin} onBlur={(event) => save({ vin: event.target.value })} />
        <Input type="number" defaultValue={data.mileage} onBlur={(event) => save({ mileage: Number(event.target.value) })} />
        <Input defaultValue={data.make} onBlur={(event) => save({ make: event.target.value })} />
        <Input defaultValue={data.model} onBlur={(event) => save({ model: event.target.value })} />
        <Input type="number" defaultValue={data.year} onBlur={(event) => save({ year: Number(event.target.value) })} />
        <Input defaultValue={data.color} onBlur={(event) => save({ color: event.target.value })} />
        <Input defaultValue={data.bodyType} onBlur={(event) => save({ bodyType: event.target.value })} />
        <Select defaultValue={data.carClass} onChange={(event) => save({ carClass: event.target.value })}>
          {Object.entries(CAR_CLASS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              Класс {label}
            </option>
          ))}
        </Select>
      </section>
      <History title="История автомобиля" orders={history.data || []} />
      <Button
        variant="danger"
        onClick={async () => {
          if (!confirm('Удалить автомобиль без заявок?')) return;
          await api(`/vehicles/${id}`, { method: 'DELETE' });
          window.location.href = `/app/clients/${data.clientId}`;
        }}
      >
        Удалить автомобиль
      </Button>
    </div>
  );
}
