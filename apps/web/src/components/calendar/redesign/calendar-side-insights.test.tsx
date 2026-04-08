import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarSideInsights } from './calendar-side-insights';
import type { CalendarEventView } from './calendar-types';

function makeEvent(overrides: Partial<CalendarEventView> = {}): CalendarEventView {
  return {
    id: 'event-1',
    title: 'Jane Doe — Follow-Up',
    start: '2026-04-14',
    end: '2026-04-14',
    type: 'followup',
    projectId: 'project-1',
    color: '#F59E0B',
    notes: null,
    projectCustomer: 'Jane Doe',
    projectAddress: '123 Fence Lane',
    searchText: 'jane doe followup',
    ...overrides,
  };
}

function findEventMixValue(container: HTMLElement, label: string) {
  const labelNode = Array.from(container.querySelectorAll('span')).find(
    (node) => node.textContent === label
  );

  if (!labelNode?.parentElement?.textContent) {
    throw new Error(`Could not find event mix row for ${label}`);
  }

  return labelNode.parentElement.textContent.replace(label, '').trim();
}

describe('CalendarSideInsights', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T10:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('counts follow-up calendar events from task-backed follow-up items', () => {
    act(() => {
      root.render(
        <CalendarSideInsights
          currentDate={new Date('2026-04-10T00:00:00.000Z')}
          isLoading={false}
          onOpenEvent={vi.fn()}
          onViewFullSchedule={vi.fn()}
          events={[
            makeEvent(),
            makeEvent({
              id: 'followup-task-2',
              start: '2026-05-01',
              end: '2026-05-01',
            }),
            makeEvent({
              id: 'install-project-1',
              title: 'Jane Doe — Install',
              start: '2026-04-20',
              end: '2026-04-20',
              type: 'install',
              color: '#10B981',
              searchText: 'jane doe install',
            }),
          ]}
        />
      );
    });

    expect(findEventMixValue(container, 'Follow-up')).toBe('1');
  });
});
