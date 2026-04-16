import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('completes actionable task cards inline from the action-needed lane', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DashboardCommandQueue
            isLoading={false}
            onCompleteActionItem={onComplete}
            queue={{
              actionNeeded: [
                {
                  id: 'a2',
                  actionId: 'sequence-task-1',
                  source: 'ESTIMATE_FOLLOW_UP',
                  projectId: 'p9',
                  customer: 'Sharon Harbach',
                  address: '321 River Meadows Ln',
                  title: 'Collect signed HOA form',
                  reason: 'Need this before install scheduling.',
                  urgency: 'MEDIUM',
                  financeProjectMode: null,
                  href: '/projects/p9?tab=follow-up',
                },
              ],
              moneyAtRisk: [],
              scheduleBlockers: [],
            }}
          />
        </MemoryRouter>,
      );
    });

    const completeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Complete')
    );

    await act(async () => {
      completeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a2', actionId: 'sequence-task-1', source: 'ESTIMATE_FOLLOW_UP' })
    );
  });

  it('reassigns and reschedules calendar-backed action-needed cards inline', async () => {
    const onAssign = vi.fn().mockResolvedValue(undefined);
    const onReschedule = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DashboardCommandQueue
            isLoading={false}
            onAssignActionItem={onAssign}
            onRescheduleActionItem={onReschedule}
            users={[
              { id: 'user-1', name: 'Adnaan', email: 'adnaan@fencetastic.com' },
              { id: 'user-2', name: 'Office Admin', email: 'office@fencetastic.com' },
            ]}
            queue={{
              actionNeeded: [
                {
                  id: 'a-manual',
                  actionId: 'calendar-event-1',
                  source: 'WORKFLOW_TASK',
                  projectId: 'p9',
                  customer: 'Sharon Harbach',
                  address: '321 River Meadows Ln',
                  title: 'Collect signed HOA form',
                  reason: 'Need this before install scheduling.',
                  urgency: 'MEDIUM',
                  financeProjectMode: null,
                  href: '/calendar?date=2026-04-08',
                  dueDate: '2026-04-08',
                  assignedToUserId: 'user-2',
                  assignedToName: 'Office Admin',
                },
              ],
              moneyAtRisk: [],
              scheduleBlockers: [],
            }}
          />
        </MemoryRouter>,
      );
    });

    const ownerSelect = container.querySelector('select[aria-label="Assign owner for Collect signed HOA form"]') as HTMLSelectElement | null;
    expect(ownerSelect).not.toBeNull();

    await act(async () => {
      ownerSelect!.value = 'user-1';
      ownerSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onAssign).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a-manual', actionId: 'calendar-event-1' }),
      'user-1',
    );

    const dueDateInput = container.querySelector('input[aria-label="Reschedule Collect signed HOA form"]') as HTMLInputElement | null;
    expect(dueDateInput).not.toBeNull();

    await act(async () => {
      dueDateInput!.value = '2026-04-10';
      dueDateInput!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const saveDueDateButton = container.querySelector('button[aria-label="Save due date for Collect signed HOA form"]');
    await act(async () => {
      saveDueDateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });

    expect(onReschedule).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a-manual', actionId: 'calendar-event-1' }),
      '2026-04-10',
    );
  });
});
