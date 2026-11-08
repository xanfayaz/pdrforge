'use client';

import { Providers } from '@/components/providers';
import { Shell } from '@/components/shell';

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Shell>{children}</Shell>
    </Providers>
  );
}
