'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function isIos() {
  const agent = window.navigator.userAgent;
  const classic = /iPhone|iPad|iPod/.test(agent);
  const ipadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return classic || ipadOs;
}

function isStandalone() {
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return media || navigatorWithStandalone.standalone === true;
}

export function IosInstallHint({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIos() || isStandalone()) return;
    if (localStorage.getItem('pdrforge_install_hint') === 'hide') return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className={cn('rounded-2xl border border-[#3c8dff]/30 bg-[#121a28] p-4 text-sm text-[#d5deea]', className)}>
      <p>
        Чтобы открывать PDRForge как приложение, в Safari нажмите «Поделиться», затем «На экран „Домой“». Ярлык откроется на весь экран.
      </p>
      <button
        type="button"
        className="mt-3 text-xs text-[#9ec4ff]"
        onClick={() => {
          localStorage.setItem('pdrforge_install_hint', 'hide');
          setVisible(false);
        }}
      >
        Больше не показывать
      </button>
    </div>
  );
}
