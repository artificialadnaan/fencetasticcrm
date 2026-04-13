import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataSurfaceProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  contentClassName?: string;
  tone?: 'dark' | 'light';
}

export function DataSurface({
  title,
  eyebrow,
  actions,
  className,
  contentClassName,
  tone = 'dark',
  children,
  ...props
}: DataSurfaceProps) {
  return (
    <section
      className={cn(
        tone === 'dark'
          ? 'rounded-[28px] border border-white/10 bg-[#11161d] shadow-[0_18px_48px_rgba(0,0,0,0.32)]'
          : 'rounded-[28px] border border-[#d9e1ef] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        className,
      )}
      {...props}
    >
      {(title || eyebrow || actions) && (
        <header className={cn(
          'flex items-start justify-between gap-4 px-6 py-5',
          tone === 'dark' ? 'border-b border-white/8' : 'border-b border-[#e5e7eb]',
        )}>
          <div>
            {eyebrow ? (
              <p className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.24em]',
                tone === 'dark' ? 'text-[#8f9aae]' : 'text-[#6b7280]',
              )}>
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className={cn(
                'mt-2 text-xl font-semibold tracking-[-0.04em]',
                tone === 'dark' ? 'text-[#f7f8fb]' : 'text-[#111827]',
              )}>
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
