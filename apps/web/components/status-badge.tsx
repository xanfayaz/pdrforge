import { ORDER_STATUS_LABEL, type OrderStatus } from '@pdrforge/shared';
import { cn } from '@/lib/utils';

const tone: Record<OrderStatus, string> = {
  draft: 'bg-white/5 text-[#c5ceda]',
  planned: 'bg-[#17304f] text-[#9ec4ff]',
  in_progress: 'bg-[#3a2416] text-[#ffc09a]',
  done: 'bg-[#143228] text-[#8ee0bf]',
};

export function StatusBadge({ status }: { status: string }) {
  const key = (status in tone ? status : 'draft') as OrderStatus;
  return <span className={cn('rounded-full px-2 py-0.5 text-xs', tone[key])}>{ORDER_STATUS_LABEL[key]}</span>;
}
