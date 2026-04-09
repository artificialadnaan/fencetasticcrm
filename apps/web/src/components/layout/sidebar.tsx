import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Calendar, DollarSign, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Wallet, Grid3X3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', icon: FolderOpen },
  { label: 'Grid View', path: '/projects/grid', icon: Grid3X3 },
  { label: 'Finances', path: '/finances', icon: Wallet },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Commissions', path: '/commissions', icon: DollarSign },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function getNavItemAriaLabel(label: string, collapsed: boolean) {
  return collapsed ? label : undefined;
}

export function getSidebarToggleAriaLabel(collapsed: boolean) {
  return collapsed ? 'Expand navigation' : 'Collapse navigation';
}

export function getSignOutAriaLabel() {
  return 'Sign out';
}

function NavItem({ item, collapsed, onClick }: { item: (typeof NAV_ITEMS)[number]; collapsed: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.path}
      onClick={onClick}
      aria-label={getNavItemAriaLabel(item.label, collapsed)}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200',
          'text-sidebar-foreground/68 hover:bg-white/8 hover:text-white',
          isActive
            ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
            : 'hover:translate-x-0.5'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-transparent transition-colors',
              'bg-white/4 text-sidebar-foreground/80',
              isActive
                ? 'border-white/10 bg-[rgba(90,138,242,0.18)] text-white'
                : 'group-hover:border-white/10 group-hover:bg-white/8 group-hover:text-white'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
          </span>
          {!collapsed && <span>{item.label}</span>}
        </>
      )}
    </NavLink>
  );
  if (collapsed) {
    return (<Tooltip delayDuration={0}><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right" className="font-medium">{item.label}</TooltipContent></Tooltip>);
  }
  return link;
}

function DesktopSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function handleLogout() { await logout(); navigate('/login'); }

  return (
    <aside
      className={cn(
        'shell-sidebar hidden md:flex',
        'fixed inset-y-0 left-0 z-40 flex-col border-r border-sidebar-border/80 transition-all duration-300',
        collapsed ? 'w-[104px]' : 'w-[272px]'
      )}
    >
      <div className={cn('flex items-center gap-3 px-5 pb-6 pt-5', collapsed && 'justify-center px-3')}>
        <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(106,153,255,0.32),_rgba(255,255,255,0.02)_72%)] text-lg font-semibold text-white shadow-[0_18px_48px_rgba(4,10,24,0.35)]">
          F
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sidebar-foreground/45">
              Unified CRM
            </p>
            <h1 className="truncate text-lg font-semibold tracking-[-0.03em] text-white">
              Fencetastic
            </h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-2xl text-sidebar-foreground/70 hover:bg-white/8 hover:text-white"
          onClick={onToggle}
          aria-label={getSidebarToggleAriaLabel(collapsed)}
          title={getSidebarToggleAriaLabel(collapsed)}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        <TooltipProvider>{NAV_ITEMS.map((item) => <NavItem key={item.path} item={item} collapsed={collapsed} />)}</TooltipProvider>
      </nav>
      <div className="px-4 pb-4">
        <div className={cn('rounded-[28px] border border-white/8 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]', collapsed && 'flex justify-center px-2')}>
          {!collapsed && user && (
            <>
              <div className="mb-3 rounded-2xl bg-black/15 px-3 py-3">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
                <p className="truncate text-xs text-sidebar-foreground/50">{user.email}</p>
              </div>
            </>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors',
              'text-sidebar-foreground/70 hover:bg-white/8 hover:text-white',
              collapsed && 'w-auto justify-center px-0'
            )}
            aria-label={getSignOutAriaLabel()}
            title={collapsed ? getSignOutAriaLabel() : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />{!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function handleLogout() { await logout(); onOpenChange(false); navigate('/login'); }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="shell-sidebar w-[300px] border-sidebar-border/80 px-0 pb-0 pt-6 text-sidebar-foreground sm:max-w-[300px]"
      >
        <div className="px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(106,153,255,0.32),_rgba(255,255,255,0.02)_72%)] text-lg font-semibold text-white shadow-[0_18px_48px_rgba(4,10,24,0.35)]">
              F
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sidebar-foreground/45">
                Unified CRM
              </p>
              <h1 className="truncate text-lg font-semibold tracking-[-0.03em] text-white">
                Fencetastic
              </h1>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {NAV_ITEMS.map((item) => <NavItem key={item.path} item={item} collapsed={false} onClick={() => onOpenChange(false)} />)}
        </nav>
        <Separator className="bg-white/8" />
        <div className="p-4">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {user && (
              <div className="mb-3 rounded-2xl bg-black/15 px-3 py-3">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
                <p className="truncate text-xs text-sidebar-foreground/50">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-white/8 hover:text-white"
              aria-label={getSignOutAriaLabel()}
            >
              <LogOut className="h-5 w-5 shrink-0" /><span>Sign Out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileOpenChange,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <DesktopSidebar collapsed={collapsed} onToggle={onToggle} />
      <MobileSidebar open={mobileOpen} onOpenChange={onMobileOpenChange} />
    </>
  );
}
