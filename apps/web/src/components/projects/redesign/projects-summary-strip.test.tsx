import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectsSummaryStrip } from './projects-summary-strip';

describe('ProjectsSummaryStrip', () => {
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

  it('shows unavailable counts instead of stale data when the page is in an error state', () => {
    act(() => {
      root.render(
        <ProjectsSummaryStrip
          projects={[
            {
              id: 'p-1',
              customer: 'Acme Fence',
              address: '123 Oak St',
              fenceType: 'WOOD',
              status: 'OPEN',
              projectTotal: 5000,
              moneyReceived: 4500,
              customerPaid: 1500,
              installDate: '2026-04-01',
              receivable: 3500,
              profitPercent: 22.5,
            } as never,
          ]}
          pagination={{ page: 1, limit: 20, total: 1, totalPages: 1 }}
          isLoading={false}
          error="Network failed"
        />
      );
    });

    expect(container.textContent).toContain('Unavailable');
    expect(container.textContent).not.toContain('1 total');
    expect(container.textContent).not.toContain('1 project');
  });
});
