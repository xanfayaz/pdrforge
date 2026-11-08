'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DemoButton } from '@/components/demo-button';
import { Logo } from '@/components/logo';
import { IosInstallHint } from '@/components/ios-install-hint';
import { apiBase } from '@/lib/api';

export default function LoginPage() {
  const [health, setHealth] = useState<'wait' | 'ok' | 'down'>('wait');

  useEffect(() => {
    if (localStorage.getItem('pdrforge_token')) {
      window.location.href = '/app';
      return;
    }
    fetch(`${apiBase()}/health`)
      .then((response) => setHealth(response.ok ? 'ok' : 'down'))
      .catch(() => setHealth('down'));
  }, []);

  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-5 py-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <section className="panel w-full p-6 sm:p-8">
        <Logo />
        <h1 className="mt-6 font-display text-3xl">Кабинет мастерской</h1>
        <p className="mt-3 text-sm text-[#9aa6b5]">
          Регистрации нет. Демо-вход открывает «Северный Контур» — мастерскую с клиентами, заявками и настроенным конструктором.
        </p>
        <DemoButton className="mt-6" variant="accent">
          Войти как демо
        </DemoButton>
        <IosInstallHint className="mt-4" />
        <p className="mt-4 text-xs text-[#8b97a8]">
          API: {health === 'ok' ? 'отвечает' : health === 'down' ? 'не запущен' : 'проверяю…'}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-[#9ec4ff]">
          На лендинг
        </Link>
      </section>
    </main>
  );
}
