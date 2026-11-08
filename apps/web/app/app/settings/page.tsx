'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { api, media } from '@/lib/api';
import { money } from '@/lib/format';
import type { Direction, ServiceItem, Workshop } from '@/lib/types';

export default function SettingsPage() {
  const workshop = useQuery({ queryKey: ['workshop'], queryFn: () => api<Workshop>('/workshop') });
  const services = useQuery({ queryKey: ['services'], queryFn: () => api<ServiceItem[]>('/catalog/services') });
  if (!workshop.data) return <p className="text-[#8b97a8]">Настройки…</p>;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Мастерская</h1>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          <TabsTrigger value="legal">Реквизиты</TabsTrigger>
          <TabsTrigger value="directions">Направления</TabsTrigger>
          <TabsTrigger value="services">Услуги</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileForm workshop={workshop.data} />
        </TabsContent>
        <TabsContent value="legal">
          <LegalForm workshop={workshop.data} />
        </TabsContent>
        <TabsContent value="directions">
          <DirectionsForm directions={workshop.data.directions} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesForm directions={workshop.data.directions} services={services.data || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileForm({ workshop }: { workshop: Workshop }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(workshop);
  return (
    <section className="panel grid gap-3 p-4 md:grid-cols-2">
      <Field label="Название" value={form.name} onChange={(name) => setForm({ ...form, name })} />
      <Field label="Телефон" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
      <Field label="Почта" value={form.email} onChange={(email) => setForm({ ...form, email })} />
      <Field label="Город" value={form.city} onChange={(city) => setForm({ ...form, city })} />
      <Field label="Адрес" value={form.address} onChange={(address) => setForm({ ...form, address })} />
      <label className="text-xs text-[#8b97a8] md:col-span-2">
        Логотип PNG или JPEG
        <input
          className="mt-1 block text-sm"
          type="file"
          accept="image/png,image/jpeg"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const body = new FormData();
            body.append('file', file);
            await api('/workshop/logo', { method: 'POST', body });
            qc.invalidateQueries({ queryKey: ['workshop'] });
          }}
        />
        {workshop.logoPath ? <img src={media(workshop.logoPath)} alt="" className="mt-2 h-16 rounded bg-white/5" /> : null}
      </label>
      <Button className="md:col-span-2" onClick={() => saveWorkshop(form, qc)}>
        Сохранить профиль
      </Button>
    </section>
  );
}

function LegalForm({ workshop }: { workshop: Workshop }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(workshop);
  return (
    <section className="panel grid gap-3 p-4 md:grid-cols-2">
      <Field label="Юрлицо" value={form.legalName} onChange={(legalName) => setForm({ ...form, legalName })} />
      <Field label="ИНН" value={form.inn} onChange={(inn) => setForm({ ...form, inn })} />
      <Field label="ОГРН" value={form.ogrn} onChange={(ogrn) => setForm({ ...form, ogrn })} />
      <Field label="КПП" value={form.kpp} onChange={(kpp) => setForm({ ...form, kpp })} />
      <Field label="Банк" value={form.bankName} onChange={(bankName) => setForm({ ...form, bankName })} />
      <Field label="БИК" value={form.bik} onChange={(bik) => setForm({ ...form, bik })} />
      <Field label="Расчётный счёт" value={form.account} onChange={(account) => setForm({ ...form, account })} />
      <Field label="Корр. счёт" value={form.corrAccount} onChange={(corrAccount) => setForm({ ...form, corrAccount })} />
      <label className="flex items-center justify-between text-sm md:col-span-2">
        Цены включают НДС
        <Switch checked={form.vatEnabled} onCheckedChange={(vatEnabled) => setForm({ ...form, vatEnabled })} />
      </label>
      <Field label="Ставка НДС, %" value={String(form.vatRate)} onChange={(value) => setForm({ ...form, vatRate: Number(value) })} />
      <label className="text-xs text-[#8b97a8] md:col-span-2">
        Текст печати
        <Textarea className="mt-1" value={form.stampText} onChange={(event) => setForm({ ...form, stampText: event.target.value })} />
      </label>
      <Button className="md:col-span-2" onClick={() => saveWorkshop(form, qc)}>
        Сохранить реквизиты
      </Button>
    </section>
  );
}

function DirectionsForm({ directions }: { directions: Direction[] }) {
  const qc = useQueryClient();
  const [items, setItems] = useState(directions);
  const [custom, setCustom] = useState('');
  return (
    <section className="panel space-y-3 p-4">
      {items.map((item, index) => (
        <label key={item.code} className="flex items-center justify-between gap-3">
          <span>
            {item.name}
            {item.isCustom ? <span className="ml-2 text-xs text-[#9ec4ff]">своё</span> : null}
          </span>
          <Switch checked={item.enabled} onCheckedChange={(enabled) => setItems(items.map((row, i) => (i === index ? { ...row, enabled } : row)))} />
        </label>
      ))}
      <div className="flex gap-2">
        <Input placeholder="Своё направление" value={custom} onChange={(event) => setCustom(event.target.value)} />
        <Button
          variant="outline"
          onClick={() => {
            if (custom.trim().length < 2) return;
            setItems([...items, { id: '', code: '', name: custom.trim(), enabled: true, isCustom: true, sort: 200 }]);
            setCustom('');
          }}
        >
          Добавить
        </Button>
      </div>
      <Button
        onClick={async () => {
          await api('/workshop/directions', { method: 'PUT', body: JSON.stringify({ items }) });
          qc.invalidateQueries({ queryKey: ['workshop'] });
        }}
      >
        Сохранить направления
      </Button>
    </section>
  );
}

function ServicesForm({ directions, services }: { directions: Direction[]; services: ServiceItem[] }) {
  const qc = useQueryClient();
  const [direction, setDirection] = useState(directions.find((item) => item.enabled)?.code || 'pdr');
  const [name, setName] = useState('');
  const [price, setPrice] = useState(3000);
  const [isComplex, setComplex] = useState(false);
  const visible = services.filter((item) => item.directionCode === direction);
  return (
    <section className="panel space-y-3 p-4">
      <Select value={direction} onChange={(event) => setDirection(event.target.value)}>
        {directions.filter((item) => item.enabled).map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </Select>
      <ul className="space-y-2 text-sm">
        {visible.map((item) => (
          <li key={item.id} className="flex items-center justify-between">
            <span>
              {item.isComplex ? 'Комплекс · ' : ''}
              {item.name} · {money(item.price)}
            </span>
            <button
              className="text-[#ffb4a2]"
              onClick={async () => {
                await api(`/catalog/services/${item.id}`, { method: 'DELETE' });
                qc.invalidateQueries({ queryKey: ['services'] });
              }}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 md:grid-cols-[1fr_120px_auto_auto]">
        <Input placeholder="Название услуги" value={name} onChange={(event) => setName(event.target.value)} />
        <Input type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isComplex} onChange={(event) => setComplex(event.target.checked)} />
          Комплекс
        </label>
        <Button
          onClick={async () => {
            await api('/catalog/services', {
              method: 'POST',
              body: JSON.stringify({ directionCode: direction, name, price, isComplex, minutes: isComplex ? 180 : 60 }),
            });
            setName('');
            qc.invalidateQueries({ queryKey: ['services'] });
          }}
        >
          Добавить
        </Button>
      </div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs text-[#8b97a8]">
      {label}
      <Input className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

async function saveWorkshop(form: Workshop, qc: ReturnType<typeof useQueryClient>) {
  const { directions: _directions, ...payload } = form;
  await api('/workshop', { method: 'PATCH', body: JSON.stringify(payload) });
  qc.invalidateQueries({ queryKey: ['workshop'] });
}
