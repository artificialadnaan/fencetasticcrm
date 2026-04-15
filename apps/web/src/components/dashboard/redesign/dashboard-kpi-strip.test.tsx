import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DashboardKpiStrip } from './dashboard-kpi-strip';

describe('DashboardKpiStrip', () => {
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

  it('routes each KPI card to its destination workspace', () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DashboardKpiStrip
            isLoading={false}
            kpis={{
              revenueMTD: 12500,
              openProjects: 14,
              outstandingReceivables: 3200,
              aimannDebtBalance: 54000,
            }}
          />
        </MemoryRouter>
      );
    });

    const links = Array.from(container.querySelectorAll('a'));
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toContain('/finances');
    expect(hrefs).toContain('/projects');
    expect(hrefs).toContain('/commissions');
  });

  it('uses high-contrast text tokens for KPI labels and values on the dark dashboard shell', () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DashboardKpiStrip
            isLoading={false}
            kpis={{
              revenueMTD: 12500,
              openProjects: 14,
              outstandingReceivables: 3200,
              aimannDebtBalance: 54000,
            }}
          />
        </MemoryRouter>
      );
    });

    const label = Array.from(container.querySelectorAll('p')).find((node) => node.textContent === 'Revenue MTD');
    const value = Array.from(container.querySelectorAll('p')).find((node) => node.textContent?.includes('$12,500'));

    expect(label?.className).toContain('text-slate-300');
    expect(value?.className).toContain('text-white');
  });
});
