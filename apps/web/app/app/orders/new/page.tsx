'use client';

import { CAR_CLASS_LABEL } from '@pdrforge/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { Client, Order } from '@/lib/types';

function NewOrderForm() {
  const router = useRouter();
  const params = useSearchParams();
  const at = params.get('at');
  const clients = useQuery({ queryKey: ['clients'], queryFn: () => api<{ items: Client[] }>('/clients?take=200') });
  const [clientId, setClientId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showClient, setShowClient] = useState(false);
  const [showCar, setShowCar] = useState(false);
  const client = clients.data?.items.find((item) => item.id === clientId);

  async function create() {
    setPending(true);
    setError(null);
    try {
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({ clientId, vehicleId, status: at ? 'planned' : 'draft' }),
      });
      if (at) {
        await api(`/orders/${order.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ scheduledAt: at, status: 'planned', durationMin: 60 }),
        });
      }
      router.push(`/app/orders/${order.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не создалось');
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-3xl">Новая заявка</h1>
      <section className="panel space-y-3 p-4">
        <Select
          value={clientId}
          onChange={(event) => {
            setClientId(event.target.value);
            setVehicleId('');
          }}
        >
          <option value="">Клиент</option>
          {(clients.data?.items || []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.phone}
            </option>
          ))}
        </Select>
        <Select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
          <option value="">Автомобиль</option>
          {(client?.vehicles || []).map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plate} · {vehicle.make} {vehicle.model}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowClient((value) => !value)}>
            Новый клиент
          </Button>
          <Button variant="ghost" onClick={() => setShowCar((value) => !value)} disabled={!clientId}>
            Новое авто
          </Button>
        </div>
        {showClient ? <QuickClient onCreated={(id) => { setClientId(id); setShowClient(false); clients.refetch(); }} /> : null}
        {showCar && clientId ? <QuickVehicle clientId={clientId} onCreated={(id) => { setVehicleId(id); setShowCar(false); clients.refetch(); }} /> : null}
        {error ? <p className="text-sm text-[#ffb4a2]">{error}</p> : null}
        <Button disabled={!clientId || !vehicleId || pending} onClick={create}>
          Создать черновик
        </Button>
      </section>
    </div>
  );
}

function QuickClient({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
      <Input placeholder="Имя" value={name} onChange={(event) => setName(event.target.value)} />
      <Input placeholder="Телефон" value={phone} onChange={(event) => setPhone(event.target.value)} />
      <Button
        variant="outline"
        onClick={async () => {
          const client = await api<Client>('/clients', { method: 'POST', body: JSON.stringify({ kind: 'person', name, phone }) });
          onCreated(client.id);
        }}
      >
        Сохранить
      </Button>
    </div>
  );
}

function QuickVehicle({ clientId, onCreated }: { clientId: string; onCreated: (id: string) => void }) {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [year, setYear] = useState(2020);
  const [mileage, setMileage] = useState(0);
  const [carClass, setCarClass] = useState('b');
  return (
    <div className="grid gap-2 md:grid-cols-3">
      <Input placeholder="Марка" value={make} onChange={(event) => setMake(event.target.value)} />
      <Input placeholder="Модель" value={model} onChange={(event) => setModel(event.target.value)} />
      <Input placeholder="Госномер" value={plate} onChange={(event) => setPlate(event.target.value)} />
      <Input placeholder="VIN" value={vin} onChange={(event) => setVin(event.target.value)} />
      <Input type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
      <Input type="number" placeholder="Пробег" value={mileage} onChange={(event) => setMileage(Number(event.target.value))} />
      <Select value={carClass} onChange={(event) => setCarClass(event.target.value)}>
        {Object.entries(CAR_CLASS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            Класс {label}
          </option>
        ))}
      </Select>
      <Button
        variant="outline"
        onClick={async () => {
          const vehicle = await api<{ id: string }>(`/clients/${clientId}/vehicles`, {
            method: 'POST',
            body: JSON.stringify({ make, model, year, plate, vin, mileage, carClass, color: '—', bodyType: 'легковой' }),
          });
          onCreated(vehicle.id);
        }}
      >
        Добавить в гараж
      </Button>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<p>Готовлю форму…</p>}>
      <NewOrderForm />
    </Suspense>
  );
}
