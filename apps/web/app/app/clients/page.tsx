'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, download } from '@/lib/api';
import type { Client } from '@/lib/types';

export default function ClientsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: 'person', name: '', phone: '', email: '', inn: '', notes: '' });
  const clients = useQuery({
    queryKey: ['clients', q],
    queryFn: () => api<{ items: Client[] }>(`/clients?take=200${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Клиенты и гараж</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => download('/export/clients.xlsx', 'pdrforge-clients.xlsx')}>
            Excel
          </Button>
          <Button onClick={() => setOpen(true)}>Новый клиент</Button>
        </div>
      </div>
      <Input className="w-full md:max-w-md" placeholder="Имя, телефон, госномер, VIN" value={q} onChange={(event) => setQ(event.target.value)} />
      <div className="grid gap-3">
        {(clients.data?.items || []).map((client) => (
          <Link key={client.id} href={`/app/clients/${client.id}`} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-lg">{client.name}</div>
              <div className="text-sm text-[#8b97a8]">
                {client.kind === 'company' ? 'Юрлицо' : 'Физлицо'} · {client.phone}
                {client.inn ? ` · ИНН ${client.inn}` : ''}
              </div>
            </div>
            <div className="text-sm text-[#c5ceda]">{client.vehicles.map((vehicle) => vehicle.plate).join(', ') || 'гараж пуст'}</div>
          </Link>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Новый клиент</DialogTitle>
          <div className="mt-4 grid gap-2">
            <Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
              <option value="person">Физлицо</option>
              <option value="company">Юрлицо</option>
            </Select>
            <Input placeholder="Имя или название" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Input placeholder="Телефон" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <Input placeholder="Почта" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Input placeholder="ИНН" value={form.inn} onChange={(event) => setForm({ ...form, inn: event.target.value })} />
            <Button
              onClick={async () => {
                await api('/clients', { method: 'POST', body: JSON.stringify(form) });
                setOpen(false);
                qc.invalidateQueries({ queryKey: ['clients'] });
              }}
            >
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
