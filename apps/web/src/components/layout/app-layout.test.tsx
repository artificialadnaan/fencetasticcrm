import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const suspendedRoute = new Promise(() => {});

vi.mock('react-router-dom', () => ({
  Outlet: () => {
    throw suspendedRoute;
  },
  useLocation: () => ({
    pathname: '/projects',
  }),
}));

vi.mock('sonner', () => ({
  Toaster: () => null,
}));

vi.mock('@/hooks/use-keyboard-shortcuts', () => ({
  useKeyboardShortcuts: () => undefined,
}));

vi.mock('./sidebar', () => ({
  default: () => <div data-testid="sidebar-shell">Sidebar</div>,
  NAV_ITEMS: [
    { path: '/', label: 'Dashboard' },
    { path: '/projects', label: 'Projects' },
  ],
}));

vi.mock('./page-shell', () => ({
  __esModule: true,
  default: ({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) => (
    <section data-testid="page-shell">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </section>
  ),
  PageShellProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AppLayout from './app-layout';

describe('AppLayout', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('keeps the shell mounted while a lazy route is loading', async () => {
    await act(async () => {
      root.render(<AppLayout />);
    });

    expect(container.querySelector('[data-testid="sidebar-shell"]')?.textContent).toContain('Sidebar');
    expect(container.querySelector('[data-testid="page-shell"]')?.textContent).toContain('Projects');
    expect(container.querySelector('[data-testid="route-loading-fallback"]')?.textContent).toContain('Loading workspace');
  });
});
