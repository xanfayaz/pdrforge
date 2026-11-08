'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CalendarRange,
  Hammer,
  LayoutDashboard,
  LineChart,
  LogOut,
  Settings,
  Users,
  Wrench,
  ClipboardList,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IosInstallHint } from '@/components/ios-install-hint';
import { Logo } from '@/components/logo';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Notice, Workshop, Employee } from '@/lib/types';

const links = [
  { href: '/app', label: 'Обзор', icon: LayoutDashboard },
  { href: '/app/orders', label: 'Заявки', icon: ClipboardList },
  { href: '/app/calendar', label: 'Календарь', icon: CalendarRange },
  { href: '/app/clients', label: 'Клиенты', icon: Users },
  { href: '/app/constructor', label: 'Конструктор', icon: Hammer },
  { href: '/app/team', label: 'Команда', icon: Wrench },
  { href: '/app/analytics', label: 'Аналитика', icon: LineChart },
  { href: '/app/settings', label: 'Настройки', icon: Settings },
];

const mobileTabs = links.slice(0, 4);
const mobileMore = links.slice(4);

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!localStorage.getItem('pdrforge_token')) {
      window.location.href = '/login';
      return;
    }
    setReady(true);
  }, []);

  const me = useQuery({
    queryKey: ['me'],
    enabled: ready,
    queryFn: () => api<{ user: Employee; workshop: Workshop }>('/auth/me'),
  });
  const notes = useQuery({
    queryKey: ['notifications'],
    enabled: ready,
    queryFn: () => api<{ items: Notice[]; unread: number }>('/notifications'),
  });

  if (!ready) {
    return <div className="grid min-h-screen place-items-center text-[#8b97a8]">PDRForge</div>;
  }

  function logout() {
    localStorage.removeItem('pdrforge_token');
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-[#0c1016]/95 px-4 py-5 md:flex">
        <Link href="/app">
          <Logo />
        </Link>
        <div className="mt-6 truncate text-sm text-[#d5deea]">{me.data?.workshop.name || 'Мастерская'}</div>
        <div className="truncate text-xs text-[#8b97a8]">{me.data?.user.name}</div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== '/app' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#b7c2d0]',
                  active && 'bg-[#172232] text-white',
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-[#3c8dff]' : 'text-[#7f8b9c]')} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="mt-4 flex items-center gap-2 px-3 py-2 text-sm text-[#8b97a8]">
          <LogOut className="h-4 w-4" />
          Выйти из демо
        </button>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#090b0e]/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
          <div className="min-w-0 md:hidden">
            <div className="font-display text-sm">PDRForge</div>
            <div className="truncate text-xs text-[#8b97a8]">{me.data?.workshop.name || 'Мастерская'}</div>
          </div>
          <div className="hidden text-sm text-[#8b97a8] md:block">Локальный кабинет · оплата тарифов не подключена</div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/app/notifications" className="relative grid h-11 w-11 place-items-center rounded-lg border border-white/10" aria-label="Уведомления">
              <Bell className="h-4 w-4" />
              {notes.data?.unread ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff7a2f] px-1 text-[10px] text-black">
                  {notes.data.unread}
                </span>
              ) : null}
            </Link>
          </div>
        </header>
        <main className="px-4 py-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-8 md:py-6 md:pb-6">{children}</main>
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c1016]/95 backdrop-blur md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-5">
            {mobileTabs.map((link) => {
              const active = link.href === '/app' ? pathname === '/app' : pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className={cn('flex min-h-14 flex-col items-center justify-center gap-1 text-[10px]', active ? 'text-white' : 'text-[#8b97a8]')}>
                  <Icon className={cn('h-5 w-5', active && 'text-[#3c8dff]')} />
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              className={cn('flex min-h-14 flex-col items-center justify-center gap-1 text-[10px]', moreOpen || mobileMore.some((link) => pathname.startsWith(link.href)) ? 'text-white' : 'text-[#8b97a8]')}
              onClick={() => setMoreOpen((value) => !value)}
            >
              <MoreHorizontal className="h-5 w-5" />
              Ещё
            </button>
          </div>
        </nav>
        {moreOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button type="button" className="absolute inset-0 bg-black/60" aria-label="Закрыть меню" onClick={() => setMoreOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-white/10 bg-[#12171e] p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
              <div className="grid gap-1">
                {mobileMore.map((link) => {
                  const Icon = link.icon;
                  const active = pathname.startsWith(link.href);
                  return (
                    <Link key={link.href} href={link.href} className={cn('flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm', active && 'bg-[#172232]')}>
                      <Icon className="h-4 w-4 text-[#3c8dff]" />
                      {link.label}
                    </Link>
                  );
                })}
                <button type="button" onClick={logout} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm text-[#8b97a8]">
                  <LogOut className="h-4 w-4" />
                  Выйти из демо
                </button>
              </div>
              <IosInstallHint className="mt-3" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
