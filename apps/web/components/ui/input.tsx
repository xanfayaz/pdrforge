import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-lg border border-white/10 bg-[#0d1218] px-3 text-base outline-none ring-[#3c8dff] placeholder:text-[#6d7888] focus:ring-2 md:h-10 md:text-sm',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
