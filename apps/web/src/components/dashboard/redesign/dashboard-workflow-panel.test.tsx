import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardWorkflowPanel } from './dashboard-workflow-panel';

describe('DashboardWorkflowPanel', () => {
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

  it('filters to unassigned tasks and completes a workflow task inline', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const onAssign = vi.fn().mockResolvedValue(undefined);
    const onReschedule = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DashboardWorkflowPanel
            isLoading={false}
            onCompleteTask={onComplete}
            onAssignTask={onAssign}
            onRescheduleTask={onReschedule}
            users={[
              { id: 'user-1', name: 'Adnaan', email: 'adnaan@fencetastic.com' },
              { id: 'user-2', name: 'Office Admin', email: 'office@fencetastic.com' },
            ]}
            overview={{
              overdueCount: 1,
              dueTodayCount: 1,
              upcomingCount: 1,
              unassignedCount: 1,
              ownerBreakdown: [
                { ownerName: 'Office Admin', count: 1 },
                { ownerName: 'Unassigned', count: 1 },
              ],
              tasks: [
                {
                  id: 'task-1',
                  projectId: 'project-1',
                  customer: 'Sharon Harbach',
                  address: '321 River Meadows Ln',
                  title: 'Collect deposit',
                  dueDate: '2026-04-07',
                  assignedToUserId: 'user-2',
                  assignedToName: 'Office Admin',
                  href: '/calendar?date=2026-04-07',
                  urgency: 'HIGH',
                },
                {
                  id: 'task-2',
                  projectId: 'project-2',
                  customer: 'Will & Marta (phase 1)',
                  address: '1141 Macgregor Ln',
                  title: 'Confirm crew',
                  dueDate: '2026-04-08',
                  assignedToUserId: null,
                  assignedToName: null,
                  href: '/calendar?date=2026-04-08',
                  urgency: 'MEDIUM',
                },
              ],
              topTasks: [
                {
                  id: 'task-1',
                  projectId: 'project-1',
                  customer: 'Sharon Harbach',
                  address: '321 River Meadows Ln',
                  title: 'Collect deposit',
                  dueDate: '2026-04-07',
                  assignedToUserId: 'user-2',
                  assignedToName: 'Office Admin',
                  href: '/calendar?date=2026-04-07',
                  urgency: 'HIGH',
                },
                {
                  id: 'task-2',
                  projectId: 'project-2',
                  customer: 'Will & Marta (phase 1)',
                  address: '1141 Macgregor Ln',
                  title: 'Confirm crew',
                  dueDate: '2026-04-08',
                  assignedToUserId: null,
                  assignedToName: null,
                  href: '/calendar?date=2026-04-08',
                  urgency: 'MEDIUM',
                },
              ],
            }}
          />
        </MemoryRouter>
      );
    });

    const unassignedButton = Array.from(container.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('Unassigned')
    );

    await act(async () => {
      unassignedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });

    expect(container.textContent).toContain('Confirm crew');
    expect(container.textContent).not.toContain('Collect deposit');

    const completeButton = Array.from(container.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('Complete')
    );

    await act(async () => {
      completeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });

    expect(onComplete).toHaveBeenCalledWith('task-2');

    const ownerSelect = container.querySelector('select[aria-label="Assign owner for Confirm crew"]') as HTMLSelectElement | null;
    expect(ownerSelect).not.toBeNull();

    await act(async () => {
      ownerSelect!.value = 'user-1';
      ownerSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onAssign).toHaveBeenCalledWith('task-2', 'user-1');

    const dueDateInput = container.querySelector('input[aria-label="Reschedule Confirm crew"]') as HTMLInputElement | null;
    expect(dueDateInput).not.toBeNull();

    await act(async () => {
      dueDateInput!.value = '2026-04-10';
      dueDateInput!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const saveDueDateButton = container.querySelector('button[aria-label="Save due date for Confirm crew"]');

    await act(async () => {
      saveDueDateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });

    expect(onReschedule).toHaveBeenCalledWith('task-2', '2026-04-10');
  });
});
