import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarPage from './calendar';

const navigateMock = vi.fn();
const useCalendarEventsMock = vi.fn();
const apiGetMock = vi.fn();

vi.mock('@/hooks/use-calendar-events', () => ({
  useCalendarEvents: (...args: unknown[]) => useCalendarEventsMock(...args),
}));

vi.mock('@/components/layout/page-shell', () => ({
  usePageShell: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('CalendarPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    navigateMock.mockReset();
    useCalendarEventsMock.mockReset();
    apiGetMock.mockReset();

    useCalendarEventsMock.mockReturnValue({
      events: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    apiGetMock.mockResolvedValue({
      data: {
        data: [],
        pagination: { totalPages: 1 },
      },
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('opens the add-event dialog from the compose query string', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={['/calendar?compose=1&type=followup&date=2026-05-09']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(document.body.textContent).toContain('Add Calendar Event');
    expect(document.body.textContent).toContain('Follow-Up');
    expect(document.body.textContent).toContain('May 2026');
    expect(document.body.textContent).toContain('Saturday, May 9');
  }, 15000);

  it('focuses the requested day from the date query string without opening the compose dialog', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={['/calendar?date=2026-04-08']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(document.body.textContent).not.toContain('Add Calendar Event');
    expect(document.body.textContent).toContain('April 2026');
    expect(document.body.textContent).toContain('Selected day');
    expect(document.body.textContent).toContain('Wednesday, Apr 8');
  }, 15000);

  it('opens the requested event from the eventId query string', async () => {
    useCalendarEventsMock.mockReturnValue({
      events: [
        {
          id: 'calendar-event-1',
          title: 'Collect signed HOA form',
          start: '2026-04-08',
          end: null,
          type: 'followup',
          color: '#F59E0B',
          projectId: 'project-1',
          notes: 'Need this before install scheduling.',
          isWorkflowTask: true,
          assignedToUserId: 'user-2',
          assignedToName: 'Office Admin',
          taskStatus: 'PENDING',
          completedAt: null,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    apiGetMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/projects')) {
        return {
          data: {
            data: [
              {
                id: 'project-1',
                customer: 'Sharon Harbach',
                address: '321 River Meadows Ln',
              },
            ],
            pagination: { totalPages: 1 },
          },
        };
      }

      return {
        data: {
          data: [{ id: 'user-2', name: 'Office Admin', email: 'office@fencetastic.com' }],
        },
      };
    });

    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={['/calendar?date=2026-04-08&eventId=calendar-event-1']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(document.body.textContent).toContain('Edit Calendar Event');
    expect(document.body.textContent).toContain('Collect signed HOA form');
  }, 15000);
});
