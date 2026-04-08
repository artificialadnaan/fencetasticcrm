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
  });
});
