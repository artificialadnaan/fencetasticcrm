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

describe('CalendarSideInsights', () => {
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

  it('renders the selected-day panel with ops-console contrast classes', () => {
    act(() => {
      root.render(
        <CalendarSideInsights
          currentDate={new Date('2026-04-10T00:00:00.000Z')}
          selectedDate={new Date('2026-04-13T00:00:00.000Z')}
          selectedDayEvents={[makeEvent({ start: '2026-04-13', end: '2026-04-13' })]}
          monthEvents={[makeEvent()]}
          isLoading={false}
          onOpenEvent={vi.fn()}
          onCreateEvent={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Selected day');
    expect(container.querySelector('section')?.className).toContain('bg-[#11161d]');
  });

  it('surfaces selected-day events in the agenda panel', () => {
    act(() => {
      root.render(
        <CalendarSideInsights
          currentDate={new Date('2026-04-10T00:00:00.000Z')}
          selectedDate={new Date('2026-04-13T00:00:00.000Z')}
          selectedDayEvents={[makeEvent({ title: 'Install for Baker', start: '2026-04-13', end: '2026-04-13', type: 'install', color: '#10B981' })]}
          monthEvents={[makeEvent()]}
          isLoading={false}
          onOpenEvent={vi.fn()}
          onCreateEvent={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Install for Baker');
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.textContent?.includes('Add event'))).toBe(true);
  });
});
