import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FinanceProjectMode } from '@fencetastic/shared';
import { DashboardCommandQueue } from './dashboard-command-queue';

describe('DashboardCommandQueue', () => {
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

  it('renders action, money, and schedule lanes from command queue data', () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DashboardCommandQueue
            isLoading={false}
            queue={{
              actionNeeded: [
                {
                  id: 'a1',
                  projectId: 'p1',
                  customer: 'Jane Doe',
                  address: '123 Fence Lane',
                  title: 'Follow-up due',
                  reason: 'Day 3 follow-up due today',
                  urgency: 'HIGH',
                  financeProjectMode: null,
                },
              ],
              moneyAtRisk: [
                {
                  id: 'm1',
                  projectId: 'p2',
                  customer: 'John Smith',
                  address: '456 Cedar Ave',
                  title: 'Outstanding receivable',
                  reason: 'Balance due 3200.00',
                  urgency: 'MEDIUM',
                  financeProjectMode: FinanceProjectMode.IMPORTED,
                },
              ],
              scheduleBlockers: [
                {
                  id: 's1',
                  projectId: 'p3',
                  customer: 'Alex Roe',
                  address: '789 Pine St',
                  title: 'Crew assignment missing',
                  reason: 'Project is active with no subcontractor assigned',
                  urgency: 'MEDIUM',
                  financeProjectMode: FinanceProjectMode.MIXED,
                },
              ],
            }}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Action Needed');
    expect(container.textContent).toContain('Money At Risk');
    expect(container.textContent).toContain('Schedule Blockers');
    expect(container.textContent).toContain('Jane Doe');
    expect(container.textContent).toContain('John Smith');
    expect(container.textContent).toContain('Alex Roe');
  });
});
