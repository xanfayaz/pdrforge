'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export function Slider({ className, ...props }: SliderPrimitive.SliderProps) {
  return (
    <SliderPrimitive.Root className={cn('relative flex h-5 w-full touch-none items-center', className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-[#2a3340]">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-[#ff7a2f]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-black/40 bg-white shadow" />
    </SliderPrimitive.Root>
  );
}
