import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FloatingActionButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => (
    <Button
      ref={ref}
      className={cn(
        'fixed bottom-5 right-5 z-30 h-14 rounded-full px-5 shadow-[0_24px_60px_rgba(15,23,42,0.24)]',
        'bg-slate-950 text-white hover:bg-slate-800 md:bottom-8 md:right-8',
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <Plus className="h-4 w-4" />
          Add New
        </>
      )}
    </Button>
  )
);

FloatingActionButton.displayName = 'FloatingActionButton';

export default FloatingActionButton;
