import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FinanceProjectMode } from '@fencetastic/shared';
import { ProjectBreakdownTable } from './project-breakdown-table';

describe('ProjectBreakdownTable', () => {
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

  it('shows finance provenance alongside commission rows', () => {
    act(() => {
      root.render(
        <ProjectBreakdownTable
          data={[
            {
              projectId: 'project-1',
              customer: 'Jane Doe',
              projectTotal: 10000,
              adnaanCommission: 1200,
              memeCommission: 500,
              aimannDeduction: 250,
              netProfit: 3100,
              completedDate: '2026-04-07',
              financeProjectMode: FinanceProjectMode.IMPORTED,
              importedSource: 'Completed Projects',
            },
          ]}
          pagination={null}
          isLoading={false}
          page={1}
          onPageChange={() => undefined}
        />
      );
    });

    expect(container.textContent).toContain('Jane Doe');
    expect(container.textContent).toContain('IMPORTED');
    expect(container.textContent).toContain('Completed Projects');
  });
});
