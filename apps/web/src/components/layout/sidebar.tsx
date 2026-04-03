import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Calendar, DollarSign, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', icon: FolderOpen },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Commissions', path: '/commissions', icon: DollarSign },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

function NavItem({ item, collapsed, onClick }: { item: (typeof NAV_ITEMS)[number]; collapsed: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  const link = (
    <NavLink to={item.path} onClick={onClick}
      className={({ isActive }) => cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        'hover:bg-sidebar-accent hover:text-white',
        isActive ? 'bg-gradient-to-r from-brand-purple/20 to-brand-cyan/20 text-white border-l-2 border-brand-purple' : 'text-sidebar-foreground/70'
      )}>
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
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
    <aside className={cn('hidden md:flex flex-col h-screen bg-sidebar sticky top-0 border-r border-sidebar-border transition-all duration-300', collapsed ? 'w-[68px]' : 'w-[240px]')}>
      <div className="flex items-center justify-between px-4 py-5">
        {!collapsed && <h1 className="text-lg font-bold bg-gradient-to-r from-brand-purple to-brand-cyan bg-clip-text text-transparent">Fencetastic</h1>}
        <Button variant="ghost" size="icon" className="text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent h-8 w-8" onClick={onToggle}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex-1 px-3 py-4 space-y-1">
        <TooltipProvider>{NAV_ITEMS.map((item) => <NavItem key={item.path} item={item} collapsed={collapsed} />)}</TooltipProvider>
      </nav>
      <Separator className="bg-sidebar-border" />
      <div className="px-3 py-4">
        {!collapsed && user && (<div className="px-3 py-2 mb-2"><p className="text-sm font-medium text-sidebar-foreground">{user.name}</p><p className="text-xs text-sidebar-foreground/50">{user.email}</p></div>)}
        <button onClick={handleLogout} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full', 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors')}>
          <LogOut className="h-5 w-5 shrink-0" />{!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function handleLogout() { await logout(); setOpen(false); navigate('/login'); }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden fixed top-3 left-3 z-50 bg-sidebar text-white hover:bg-sidebar-accent"><Menu className="h-5 w-5" /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] p-0 bg-sidebar border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-5">
          <h1 className="text-lg font-bold bg-gradient-to-r from-brand-purple to-brand-cyan bg-clip-text text-transparent">Fencetastic</h1>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent h-8 w-8" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <Separator className="bg-sidebar-border" />
        <nav className="flex-1 px-3 py-4 space-y-1">{NAV_ITEMS.map((item) => <NavItem key={item.path} item={item} collapsed={false} onClick={() => setOpen(false)} />)}</nav>
        <Separator className="bg-sidebar-border" />
        <div className="px-3 py-4">
          {user && (<div className="px-3 py-2 mb-2"><p className="text-sm font-medium text-sidebar-foreground">{user.name}</p><p className="text-xs text-sidebar-foreground/50">{user.email}</p></div>)}
          <button onClick={handleLogout} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors">
            <LogOut className="h-5 w-5 shrink-0" /><span>Sign Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (<><DesktopSidebar collapsed={collapsed} onToggle={onToggle} /><MobileSidebar /></>);
}
