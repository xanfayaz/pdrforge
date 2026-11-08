'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export function DemoButton({
  children = 'Войти как демо',
  variant = 'default' as 'default' | 'accent' | 'outline',
  className,
}: {
  children?: React.ReactNode;
  variant?: 'default' | 'accent' | 'outline';
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter() {
    setPending(true);
    setError(null);
    try {
      const data = await api<{ accessToken: string }>('/auth/demo', { method: 'POST' });
      localStorage.setItem('pdrforge_token', data.accessToken);
      window.location.href = '/app';
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось войти');
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <Button variant={variant} size="lg" onClick={enter} disabled={pending}>
        {pending ? 'Открываю кабинет…' : children}
      </Button>
      {error ? <p className="mt-2 max-w-sm text-sm text-[#ffb4a2]">{error}</p> : null}
    </div>
  );
}
