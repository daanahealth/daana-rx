import * as React from 'react';

import { cn } from '@/lib/utils';

// DESIGN.md › Inputs: 40px, 6px radius, Line Strong border, teal focus ring.
// 16px text on touch so iOS does not zoom the page on focus.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-sm border border-border-strong bg-card px-3 text-base text-foreground sm:text-sm',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0',
          'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30',
          'disabled:cursor-not-allowed disabled:bg-panel disabled:text-muted-foreground',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
