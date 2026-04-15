import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EstimateFollowUpTaskKind, ProjectStatus } from '@fencetastic/shared';
import { DashboardFollowupsPanel } from './dashboard-followups-panel';

describe('DashboardFollowupsPanel', () => {
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

  it('renders dashboard follow-up cards from due task data', () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DashboardFollowupsPanel
            isLoading={false}
            followUps={[
              {
                id: 'task-7',
                projectId: 'project-7',
                customer: 'Jane Doe',
                address: '123 Fence Lane',
                status: ProjectStatus.ESTIMATE,
                dueDate: '2026-04-09',
                kind: EstimateFollowUpTaskKind.DAY_7,
                title: null,
                notes: null,
                href: '/projects/project-7?tab=follow-up',
                assignedToName: 'Office Admin',
                source: 'WORKFLOW_TASK',
              },
            ]}
          />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Jane Doe');
    expect(container.textContent).toContain('123 Fence Lane');
    expect(container.textContent).toContain('Apr 9, 2026');
    expect(container.textContent).toContain('Day 7');
    expect(container.textContent).toContain('Office Admin');
    expect(container.textContent).toContain('Add task');

    const links = Array.from(container.querySelectorAll('a'));
    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/calendar?compose=1&type=followup');
    expect(hrefs).toContain('/projects/project-7?tab=follow-up');
  });

  it('renders manual task follow-ups with their calendar focus link', () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DashboardFollowupsPanel
            isLoading={false}
            followUps={[
              {
                id: 'manual-1',
                projectId: 'project-88',
                customer: 'Sharon Harbach',
                address: '321 River Meadows Ln',
                status: ProjectStatus.OPEN,
                dueDate: '2026-04-08',
                kind: 'MANUAL',
                title: 'Collect signed HOA form',
                notes: 'Need this before install scheduling.',
                href: '/calendar?date=2026-04-08',
                assignedToName: 'Adnaan',
                source: 'WORKFLOW_TASK',
              },
            ]}
          />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Collect signed HOA form');

    const links = Array.from(container.querySelectorAll('a'));
    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/calendar?date=2026-04-08');
  });
});
