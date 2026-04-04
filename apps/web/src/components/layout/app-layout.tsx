import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import Sidebar, { NAV_ITEMS } from './sidebar';
import PageShell, { PageShellProvider, type PageShellConfig } from './page-shell';

const ROUTE_SUBTITLES: Record<string, string> = {
  '/': 'Overview of your operations, revenue, and active fieldwork.',
  '/projects': 'Track pipeline, installs, and project delivery from one workspace.',
  '/projects/grid': 'Review installations and update key project details in bulk.',
  '/finances': 'Monitor transactions, cash movement, and current financial activity.',
  '/calendar': 'Coordinate installs, follow-ups, and upcoming schedule commitments.',
  '/commissions': 'Review rep performance, payouts, and commission status.',
  '/reports': 'Export operational snapshots and review business reporting.',
  '/settings': 'Adjust account preferences and application configuration.',
};

function getDefaultShellConfig(pathname: string): PageShellConfig {
  if (pathname.startsWith('/projects/') && pathname.endsWith('/work-order')) {
    return {
      eyebrow: 'Project Work Order',
      title: 'Work Order',
      subtitle: 'Review project scope, measurements, and install preparation details.',
    };
  }

  if (pathname.startsWith('/projects/')) {
    return {
      eyebrow: 'Project Workspace',
      title: 'Project Detail',
      subtitle: 'Review customer, install, and financial details for this project.',
    };
  }

  const matchedItem = NAV_ITEMS.find((item) => item.path === pathname) ?? NAV_ITEMS[0];
  return {
    eyebrow: matchedItem.label,
    title: matchedItem.label,
    subtitle: ROUTE_SUBTITLES[matchedItem.path] ?? 'Unified workspace for Fencetastic operations.',
  };
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pageShellConfig, setPageShellConfig] = useState<PageShellConfig>({});
  const location = useLocation();
  const { user } = useAuth();

  const shellConfig = useMemo(() => {
    const defaults = getDefaultShellConfig(location.pathname);
    return {
      ...defaults,
      ...pageShellConfig,
      title: pageShellConfig.title ?? defaults.title,
      subtitle: pageShellConfig.subtitle ?? defaults.subtitle,
      eyebrow: pageShellConfig.eyebrow ?? defaults.eyebrow,
    };
  }, [location.pathname, pageShellConfig]);

  return (
    <PageShellProvider value={setPageShellConfig}>
      <div className="shell-app min-h-screen text-foreground">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
          onToggle={() => setCollapsed((value) => !value)}
        />
        <main
          className={cn(
            'min-h-screen transition-[padding] duration-300 ease-out',
            collapsed ? 'md:pl-[104px]' : 'md:pl-[272px]'
          )}
        >
          <PageShell
            {...shellConfig}
            user={user}
            onOpenSidebar={() => setMobileOpen(true)}
          >
            <Outlet />
          </PageShell>
        </main>
      </div>
    </PageShellProvider>
  );
}
