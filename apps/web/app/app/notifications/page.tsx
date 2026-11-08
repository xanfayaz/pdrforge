'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { when } from '@/lib/format';
import type { Notice } from '@/lib/types';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const notes = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ items: Notice[]; unread: number }>('/notifications'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Уведомления</h1>
        <Button
          variant="outline"
          onClick={async () => {
            await api('/notifications/read-all', { method: 'POST' });
            qc.invalidateQueries({ queryKey: ['notifications'] });
          }}
        >
          Прочитать все
        </Button>
      </div>
      <div className="space-y-2">
        {(notes.data?.items || []).map((note) => (
          <button
            key={note.id}
            className={`panel block w-full px-4 py-3 text-left ${note.read ? 'opacity-60' : ''}`}
            onClick={async () => {
              await api(`/notifications/${note.id}/read`, { method: 'POST' });
              qc.invalidateQueries({ queryKey: ['notifications'] });
            }}
          >
            <div className="flex justify-between gap-3">
              <span>{note.title}</span>
              <span className="text-xs text-[#8b97a8]">{when(note.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-[#9aa6b5]">{note.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
