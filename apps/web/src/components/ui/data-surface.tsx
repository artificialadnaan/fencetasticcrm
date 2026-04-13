import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataSurfaceProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  contentClassName?: string;
}

export function DataSurface({
  title,
  eyebrow,
  actions,
  className,
  contentClassName,
  children,
  ...props
}: DataSurfaceProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/10 bg-[#11161d] shadow-[0_18px_48px_rgba(0,0,0,0.32)]',
        className,
      )}
      {...props}
    >
      {(title || eyebrow || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f9aae]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#f7f8fb]">
                {title}
              </h2>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className={cn('px-6 py-5', contentClassName)}>{children}</div>
    </section>
  );
}

