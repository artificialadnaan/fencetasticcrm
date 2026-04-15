import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardRevenuePanel } from './dashboard-revenue-panel';

describe('DashboardRevenuePanel', () => {
  let container: HTMLDivElement;
  let root: Root;
  let clientWidthSpy: { mockRestore(): void };
  let clientHeightSpy: { mockRestore(): void };

  beforeEach(() => {
    clientWidthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640);
    clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(320);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    clientWidthSpy.mockRestore();
    clientHeightSpy.mockRestore();
    container.remove();
  });

  it('renders the dashboard revenue chart after measuring the panel size', async () => {
    await act(async () => {
      root.render(
        <DashboardRevenuePanel
          isLoading={false}
          data={[
            { month: 'Apr 2026', revenue: 12500, expenses: 4200 },
            { month: 'May 2026', revenue: 9800, expenses: 3100 },
          ]}
        />
      );
    });

    expect(container.textContent).toContain('Revenue vs expenses');
    expect(container.textContent).not.toContain('Loading revenue chart');
    expect(container.querySelector('.recharts-wrapper')).not.toBeNull();
  });
});
