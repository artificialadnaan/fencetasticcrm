import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DashboardProjectBreakdown } from './dashboard-project-breakdown';

describe('DashboardProjectBreakdown', () => {
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

  it('renders the chart in a fixed-size surface to avoid layout-measurement warnings', () => {
    act(() => {
      root.render(
        <DashboardProjectBreakdown
          isLoading={false}
          data={[
            { fenceType: 'WOOD', count: 10 },
            { fenceType: 'METAL', count: 4 },
          ]}
        />
      );
    });

    const chartShell = Array.from(container.querySelectorAll('div')).find((node) =>
      node.className.includes('h-[320px]') && node.className.includes('justify-center')
    );

    expect(chartShell).not.toBeUndefined();
    expect(container.textContent).toContain('Project breakdown');
    expect(container.textContent).toContain('Completed Projects');
  });
});
