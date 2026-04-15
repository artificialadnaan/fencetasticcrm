import { act, cloneElement, isValidElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => {
      if (isValidElement(children)) {
        return cloneElement(children, { width: 320, height: 240 });
      }
      return <div>{children}</div>;
    },
  };
});

import { FinancesOverviewPanels } from './finances-overview-panels';

describe('FinancesOverviewPanels', () => {
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

  it('renders the expense category pie in a padded fixed-size shell without crowding the list', () => {
    act(() => {
      root.render(
        <FinancesOverviewPanels
          isMonthlyLoading={false}
          isCategoryLoading={false}
          monthly={[
            { month: 'Apr 2026', income: 12500, expenses: 4200 },
          ]}
          categories={[
            { category: 'Materials', total: 22000 },
            { category: 'Labor', total: 12000 },
          ]}
        />
      );
    });

    const pieShell = Array.from(container.querySelectorAll('div')).find((node) =>
      node.className.includes('h-[180px]') && node.className.includes('justify-center')
    );

    expect(pieShell).not.toBeUndefined();
    expect(container.textContent).toContain('Expense categories');
    expect(container.textContent).toContain('Materials');
    expect(container.textContent).toContain('Labor');
  });
});
