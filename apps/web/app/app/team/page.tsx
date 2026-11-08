'use client';

import { ROLE_LABEL, type UserRole } from '@pdrforge/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { Employee } from '@/lib/types';

export default function TeamPage() {
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ['team'], queryFn: () => api<Employee[]>('/team') });
  const [form, setForm] = useState({ name: '', phone: '', title: 'Мастер', role: 'master' });

  async function save(person: Employee, patch: Partial<Employee>) {
    await api(`/team/${person.id}`, { method: 'PATCH', body: JSON.stringify({ ...person, ...patch }) });
    qc.invalidateQueries({ queryKey: ['team'] });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Команда</h1>
      <p className="text-sm text-[#8b97a8]">Роль решает доступ к ползунку цены. Должность — то, что видно в заявке и на календаре.</p>
      <div className="grid gap-3">
        {(team.data || []).map((person) => (
          <article key={person.id} className="panel grid items-center gap-3 p-4 md:grid-cols-[auto_1fr_1fr_180px_auto]">
            <span className="h-3 w-3 rounded-full" style={{ background: person.color }} />
            <div>
              <div>{person.name}</div>
              <div className="text-xs text-[#8b97a8]">{person.phone}</div>
            </div>
            <Input defaultValue={person.title} onBlur={(event) => save(person, { title: event.target.value })} />
            <Select value={person.role} onChange={(event) => save(person, { role: event.target.value as UserRole })}>
              {Object.entries(ROLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button variant="ghost" onClick={() => save(person, { active: !person.active })}>
              {person.active ? 'Отключить' : 'Включить'}
            </Button>
          </article>
        ))}
      </div>
      <section className="panel grid gap-2 p-4 md:grid-cols-5">
        <Input placeholder="Имя" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Input placeholder="Телефон" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <Input placeholder="Должность" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button
          onClick={async () => {
            await api('/team', { method: 'POST', body: JSON.stringify({ ...form, color: '#7eb3ff' }) });
            setForm({ name: '', phone: '', title: 'Мастер', role: 'master' });
            qc.invalidateQueries({ queryKey: ['team'] });
          }}
        >
          Добавить
        </Button>
      </section>
    </div>
  );
}
