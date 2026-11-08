'use client';

import { useQuery } from '@tanstack/react-query';
import { ConstructorPanel } from '@/components/constructor-panel';
import { PricingSettings } from '@/components/pricing-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import type { ConstructorSettings } from '@/lib/types';

export default function ConstructorPage() {
  const settings = useQuery({
    queryKey: ['constructor'],
    queryFn: () => api<ConstructorSettings>('/constructor/settings'),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Конструктор повреждений</h1>
        <p className="max-w-2xl text-sm text-[#8b97a8]">
          Круг и овал идут через эквивалентный диаметр и контрольные точки. Полоса считается по матрице площади. Коэффициенты и ползунок применяются после базы.
        </p>
      </div>
      <Tabs defaultValue="calc">
        <TabsList>
          <TabsTrigger value="calc">Расчёт</TabsTrigger>
          <TabsTrigger value="setup">Настройки стоимости</TabsTrigger>
        </TabsList>
        <TabsContent value="calc">
          <ConstructorPanel panelName="Песочница" />
        </TabsContent>
        <TabsContent value="setup">{settings.data ? <PricingSettings settings={settings.data} /> : <p>Загрузка…</p>}</TabsContent>
      </Tabs>
    </div>
  );
}
