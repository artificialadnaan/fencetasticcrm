import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GridViewSummaryStrip } from './grid-view-summary';

describe('GridViewSummaryStrip', () => {
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

  it('shows unavailable grid totals when the page is in an error state', () => {
    act(() => {
      root.render(
        <GridViewSummaryStrip
          projects={[
            {
              id: 'grid-1',
              installDate: '2026-04-01',
              status: 'OPEN',
              contractDate: '2026-03-26',
              notes: 'Install 4/20',
              subcontractor: 'Froilan',
              customer: 'Acme Fence',
              address: '123 Oak St',
              description: 'Install fence',
              projectTotal: 5000,
              moneyReceived: 4500,
              customerPaid: 1500,
              paymentMethod: 'CASH',
              outstandingReceivables: 3500,
              forecastedExpenses: 900,
              materialsCost: 300,
              subPayment1: null,
              subPayment2: null,
              commissionOwed: null,
              commissionPaid: null,
              outstandingPayables: 0,
              profitDollar: 2200,
              profitPercent: 44,
              memesCommission: null,
              aimannsCommission: null,
              netProfitDollar: 2100,
              netProfitPercent: 42,
              fenceType: 'WOOD',
            } as never,
          ]}
          pagination={{ page: 1, limit: 100, total: 1, totalPages: 1 }}
          isLoading={false}
          error="Network failed"
          selectedCount={0}
        />
      );
    });

    expect(container.textContent).toContain('Unavailable');
    expect(container.textContent).toContain('Spreadsheet View');
  });
});
