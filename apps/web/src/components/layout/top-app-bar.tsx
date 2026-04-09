import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export default function TopAppBar({
  eyebrow,
  title,
  subtitle,
  searchSlot,
  primaryActions,
  secondaryActions,
  utilityActions,
  onOpenSidebar,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  searchSlot?: ReactNode;
  primaryActions?: ReactNode;
  secondaryActions?: ReactNode;
  utilityActions?: ReactNode;
  onOpenSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 px-3 pb-3 pt-3 sm:px-4 lg:px-6">
      <div className="shell-glass mx-auto flex w-full max-w-[1600px] flex-col gap-5 rounded-[28px] px-4 py-4 sm:px-5 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mt-1 h-11 w-11 rounded-2xl border border-black/5 bg-white/65 text-slate-700 shadow-sm hover:bg-white md:hidden"
              onClick={onOpenSidebar}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2rem]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {secondaryActions}
            {primaryActions}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-black/5 pt-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {searchSlot ? <div className="hidden md:block">{searchSlot}</div> : null}
            <div className="flex items-center gap-2 md:hidden">
              {searchSlot}
              {secondaryActions}
              {primaryActions}
            </div>
          </div>

          {utilityActions && (
            <div className="flex items-center gap-2">
              {utilityActions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
