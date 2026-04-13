import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarMonthGrid } from './calendar-month-grid';
import type { CalendarEventView } from './calendar-types';

function makeEvent(overrides: Partial<CalendarEventView> = {}): CalendarEventView {
  return {
    id: 'event-1',
    title: 'Jane Doe — Follow-Up',
    start: '2026-04-13',
    end: '2026-04-13',
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

describe('CalendarMonthGrid', () => {
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

  it('shows only the top two event chips and an overflow counter in each day cell', () => {
    act(() => {
      root.render(
        <CalendarMonthGrid
          currentDate={new Date('2026-04-01')}
          events={[
            makeEvent({ id: '1', start: '2026-04-13', title: 'Estimate A' }),
            makeEvent({ id: '2', start: '2026-04-13', title: 'Install B', type: 'install', color: '#10B981' }),
            makeEvent({ id: '3', start: '2026-04-13', title: 'Follow-Up C' }),
          ]}
          isLoading={false}
          selectedDate={new Date('2026-04-13')}
          onPrevMonth={vi.fn()}
          onNextMonth={vi.fn()}
          onToday={vi.fn()}
          onSelectDate={vi.fn()}
          onSelectEvent={vi.fn()}
          onCreateEvent={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Jane Doe');
    expect(container.textContent).toContain('Install');
    expect(container.textContent).toContain('Follow-up');
    expect(container.textContent).toContain('+1 more');
  });

  it('renders concise project labels and event types in the month grid cards', () => {
    act(() => {
      root.render(
        <CalendarMonthGrid
          currentDate={new Date('2026-04-01')}
          events={[
            makeEvent({
              id: '1',
              start: '2026-04-10',
              title: 'Very Long Customer Name — Install',
              type: 'install',
              color: '#10B981',
              projectCustomer: 'Very Long Customer Name',
            }),
          ]}
          isLoading={false}
          selectedDate={new Date('2026-04-10')}
          onPrevMonth={vi.fn()}
          onNextMonth={vi.fn()}
          onToday={vi.fn()}
          onSelectDate={vi.fn()}
          onSelectEvent={vi.fn()}
          onCreateEvent={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Very Long Customer Name');
    expect(container.textContent).toContain('Install');
  });
});
