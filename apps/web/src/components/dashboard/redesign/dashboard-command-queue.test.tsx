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
                  href: '/projects/p1?tab=follow-up',
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
                  title: '3 readiness blockers',
                  reason: 'Missing deposit, materials, and crew',
                  urgency: 'HIGH',
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
    expect(container.textContent).toContain('3 readiness blockers');
    expect(container.textContent).toContain('Missing deposit, materials, and crew');

    const links = Array.from(container.querySelectorAll('a'));
    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/projects/p1?tab=follow-up');
    expect(hrefs).toContain('/projects/p2');
    expect(hrefs).toContain('/projects/p3');
  });

  it('uses a queue item href when provided and exposes an add-task action for the task lane', () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DashboardCommandQueue
            isLoading={false}
            queue={{
              actionNeeded: [
                {
                  id: 'a2',
                  projectId: 'p9',
                  customer: 'Sharon Harbach',
                  address: '321 River Meadows Ln',
                  title: 'Collect signed HOA form',
                  reason: 'Need this before install scheduling.',
                  urgency: 'MEDIUM',
                  financeProjectMode: null,
                  href: '/calendar?date=2026-04-08',
                },
              ],
              moneyAtRisk: [],
              scheduleBlockers: [],
            }}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Add task');

    const links = Array.from(container.querySelectorAll('a'));
    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/calendar?date=2026-04-08');
    expect(hrefs).toContain('/calendar?compose=1&type=followup');
  });
});
