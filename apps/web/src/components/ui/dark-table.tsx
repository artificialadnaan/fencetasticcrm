import type { ComponentPropsWithoutRef, HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function DarkTableContainer({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('overflow-hidden rounded-[24px] border border-white/8 bg-[#0d1218]', className)}
      {...props}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DarkTable({
  className,
  ...props
}: ComponentPropsWithoutRef<'table'>) {
  return (
    <table
      className={cn('min-w-full border-collapse text-sm text-[#f7f8fb]', className)}
      {...props}
    />
  );
}

export function DarkTableHeader({
  className,
  sticky,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { sticky?: boolean }) {
  return (
    <th
      className={cn(
        'bg-[#131a22] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9aa6bb]',
        sticky && 'sticky top-0 z-10',
        className,
      )}
      {...props}
    />
  );
}

export function DarkTableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-t border-white/6 odd:bg-white/[0.01] even:bg-transparent hover:bg-white/[0.04]',
        className,
      )}
      {...props}
    />
  );
}

export function DarkTableCell({
  className,
  numeric,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn('px-4 py-3 align-middle text-[#e7ebf3]', numeric && 'text-right tabular-nums', className)}
      {...props}
    />
  );
}
