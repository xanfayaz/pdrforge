'use client';

import { CAR_CLASS_LABEL } from '@pdrforge/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { History } from '@/components/history';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type { Client, Order } from '@/lib/types';

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const client = useQuery({ queryKey: ['client', id], queryFn: () => api<Client>(`/clients/${id}`) });
  const history = useQuery({ queryKey: ['client-history', id], queryFn: () => api<Order[]>(`/clients/${id}/history`) });
  const [car, setCar] = useState({ make: '', model: '', year: 2020, plate: '', vin: '', mileage: 0, carClass: 'b', color: '', bodyType: 'седан' });
  if (!client.data) return <p className="text-[#8b97a8]">Клиент…</p>;
  const data = client.data;

  async function save(patch: Partial<Client>) {
    await api(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify({ ...data, ...patch }) });
    qc.invalidateQueries({ queryKey: ['client', id] });
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl">{data.name}</h1>
      <section className="panel grid gap-3 p-4 md:grid-cols-2">
        <Input defaultValue={data.name} onBlur={(event) => save({ name: event.target.value })} />
        <Input defaultValue={data.phone} onBlur={(event) => save({ phone: event.target.value })} />
        <Input defaultValue={data.email || ''} placeholder="Почта" onBlur={(event) => save({ email: event.target.value })} />
        <Input defaultValue={data.inn || ''} placeholder="ИНН" onBlur={(event) => save({ inn: event.target.value })} />
        <Textarea className="md:col-span-2" defaultValue={data.notes || ''} onBlur={(event) => save({ notes: event.target.value })} />
      </section>
      <section>
        <h2 className="font-display text-xl">Гараж</h2>
        <div className="mt-3 grid gap-2">
          {data.vehicles.map((vehicle) => (
            <Link key={vehicle.id} href={`/app/vehicles/${vehicle.id}`} className="panel px-4 py-3">
              {vehicle.plate} · {vehicle.make} {vehicle.model}, {vehicle.year}
              <span className="ml-2 text-sm text-[#8b97a8]">VIN {vehicle.vin} · {vehicle.mileage} км</span>
            </Link>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Input placeholder="Марка" value={car.make} onChange={(event) => setCar({ ...car, make: event.target.value })} />
          <Input placeholder="Модель" value={car.model} onChange={(event) => setCar({ ...car, model: event.target.value })} />
          <Input placeholder="Госномер" value={car.plate} onChange={(event) => setCar({ ...car, plate: event.target.value })} />
          <Input placeholder="VIN" value={car.vin} onChange={(event) => setCar({ ...car, vin: event.target.value })} />
          <Input placeholder="Цвет" value={car.color} onChange={(event) => setCar({ ...car, color: event.target.value })} />
          <Input type="number" value={car.year} onChange={(event) => setCar({ ...car, year: Number(event.target.value) })} />
          <Input type="number" placeholder="Пробег" value={car.mileage} onChange={(event) => setCar({ ...car, mileage: Number(event.target.value) })} />
          <Select value={car.carClass} onChange={(event) => setCar({ ...car, carClass: event.target.value })}>
            {Object.entries(CAR_CLASS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Button
            onClick={async () => {
              await api(`/clients/${id}/vehicles`, { method: 'POST', body: JSON.stringify(car) });
              qc.invalidateQueries({ queryKey: ['client', id] });
            }}
          >
            Добавить авто
          </Button>
        </div>
      </section>
      <History title="История клиента" orders={history.data || []} />
    </div>
  );
}
