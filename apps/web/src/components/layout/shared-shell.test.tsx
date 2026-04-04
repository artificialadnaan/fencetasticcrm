import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      name: 'Taylor Field',
      email: 'taylor@fencetastic.com',
      role: 'ADMIN',
    },
    isLoading: false,
    login: vi.fn(),
    logout: logoutMock,
    refreshUser: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ open, children, onOpenChange }: { open: boolean; children: React.ReactNode; onOpenChange?: (open: boolean) => void }) => (
    <div data-open={String(open)} data-testid="sheet-root" onClick={() => onOpenChange?.(false)}>
      {open ? children : null}
    </div>
  ),
  SheetContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="sheet-content">
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import Sidebar from './sidebar';
import { PageShellProvider, arePageShellConfigsEqual, usePageShell } from './page-shell';

function click(element: Element | null) {
  if (!element) {
    throw new Error('Expected element to exist');
  }

  act(() => {
    element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
      })
    );
  });
}

function getSheetContent(container: HTMLElement) {
  const sheetContent = container.querySelector('[data-testid="sheet-content"]');
  if (!sheetContent) {
    throw new Error('Expected mobile sheet content to exist');
  }
  return sheetContent;
}

describe('shared shell mounted behavior', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    navigateMock.mockReset();
    logoutMock.mockReset();
    logoutMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders accessible labels for collapsed desktop navigation controls', () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Sidebar collapsed mobileOpen={false} onMobileOpenChange={vi.fn()} onToggle={vi.fn()} />
        </MemoryRouter>
      );
    });

    expect(container.querySelector('[aria-label="Dashboard"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Expand navigation"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Sign out"]')).not.toBeNull();
  });

  it('shows and hides mobile shell content from the controlled open state', () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Sidebar collapsed={false} mobileOpen={false} onMobileOpenChange={vi.fn()} onToggle={vi.fn()} />
        </MemoryRouter>
      );
    });

    expect(container.querySelector('[data-testid="sheet-content"]')).toBeNull();

    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Sidebar collapsed={false} mobileOpen onMobileOpenChange={vi.fn()} onToggle={vi.fn()} />
        </MemoryRouter>
      );
    });

    expect(getSheetContent(container).textContent).toContain('Sign Out');
  });

  it('logs out and routes to login from the mobile shell', async () => {
    const onMobileOpenChange = vi.fn();

    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Sidebar collapsed={false} mobileOpen onMobileOpenChange={onMobileOpenChange} onToggle={vi.fn()} />
        </MemoryRouter>
      );
    });

    click(getSheetContent(container).querySelector('[aria-label="Sign out"]'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(onMobileOpenChange).toHaveBeenCalledWith(false);
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('resets page shell config on unmount after mounting with an inline object', () => {
    const setShellConfig = vi.fn();

    function TestPage({ title }: { title: string }) {
      usePageShell({ title, subtitle: 'Overview' });
      return null;
    }

    act(() => {
      root.render(
        <PageShellProvider value={setShellConfig}>
          <TestPage title="Dashboard" />
        </PageShellProvider>
      );
    });

    const updater = setShellConfig.mock.calls[0]?.[0] as ((value: Record<string, unknown>) => Record<string, unknown>) | undefined;
    expect(typeof updater).toBe('function');
    expect(updater?.({})).toEqual({ title: 'Dashboard', subtitle: 'Overview' });
    expect(arePageShellConfigsEqual(updater?.({}) ?? {}, { title: 'Dashboard', subtitle: 'Overview' })).toBe(true);

    act(() => {
      root.render(<PageShellProvider value={setShellConfig}>{null}</PageShellProvider>);
    });

    const cleanupUpdater = setShellConfig.mock.calls.at(-1)?.[0] as ((value: Record<string, unknown>) => Record<string, unknown>) | undefined;
    expect(cleanupUpdater?.({ title: 'Dashboard', subtitle: 'Overview' })).toEqual({});
  });
});
