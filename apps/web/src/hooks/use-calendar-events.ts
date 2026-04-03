import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  type: 'estimate' | 'followup' | 'install' | 'completed';
  projectId: string;
  color: string;
}

interface UseCalendarEventsReturn {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function toDateParam(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useCalendarEvents(
  start: Date | null,
  end: Date | null
): UseCalendarEventsReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startKey = start ? toDateParam(start) : null;
  const endKey = end ? toDateParam(end) : null;

  const fetchEvents = useCallback(async () => {
    if (!startKey || !endKey) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/calendar/events?start=${startKey}&end=${endKey}`);
      setEvents(res.data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load calendar events';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [startKey, endKey]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, isLoading, error, refetch: fetchEvents };
}
