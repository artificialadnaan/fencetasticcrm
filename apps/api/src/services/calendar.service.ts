import { prisma } from '../lib/prisma';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date string YYYY-MM-DD
  end: string;   // same as start — single-day events
  type: 'estimate' | 'followup' | 'install' | 'completed';
  projectId: string;
  color: string;
}

const EVENT_COLORS = {
  estimate: '#3B82F6',  // blue
  followup: '#F59E0B',  // amber
  install: '#10B981',   // green
  completed: '#6B7280', // gray
} as const;

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function getCalendarEvents(
  start: string,
  end: string
): Promise<CalendarEvent[]> {
  const startDate = new Date(start);
  const endDate = new Date(end);
  // Extend end by 1 day to make the range inclusive
  endDate.setDate(endDate.getDate() + 1);

  const projects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      OR: [
        { estimateDate: { gte: startDate, lt: endDate } },
        { followUpDate: { gte: startDate, lt: endDate } },
        { installDate: { gte: startDate, lt: endDate } },
        { completedDate: { gte: startDate, lt: endDate } },
      ],
    },
    select: {
      id: true,
      customer: true,
      estimateDate: true,
      followUpDate: true,
      installDate: true,
      completedDate: true,
    },
  });

  const events: CalendarEvent[] = [];

  for (const project of projects) {
    if (project.estimateDate) {
      const dateStr = toDateStr(project.estimateDate);
      if (dateStr >= start && dateStr <= end) {
        events.push({
          id: `estimate-${project.id}`,
          title: `${project.customer} — Estimate`,
          start: dateStr,
          end: dateStr,
          type: 'estimate',
          projectId: project.id,
          color: EVENT_COLORS.estimate,
        });
      }
    }

    if (project.followUpDate) {
      const dateStr = toDateStr(project.followUpDate);
      if (dateStr >= start && dateStr <= end) {
        events.push({
          id: `followup-${project.id}`,
          title: `${project.customer} — Follow-Up`,
          start: dateStr,
          end: dateStr,
          type: 'followup',
          projectId: project.id,
          color: EVENT_COLORS.followup,
        });
      }
    }

    if (project.installDate) {
      const dateStr = toDateStr(project.installDate);
      if (dateStr >= start && dateStr <= end) {
        events.push({
          id: `install-${project.id}`,
          title: `${project.customer} — Install`,
          start: dateStr,
          end: dateStr,
          type: 'install',
          projectId: project.id,
          color: EVENT_COLORS.install,
        });
      }
    }

    if (project.completedDate) {
      const dateStr = toDateStr(project.completedDate);
      if (dateStr >= start && dateStr <= end) {
        events.push({
          id: `completed-${project.id}`,
          title: `${project.customer} — Completed`,
          start: dateStr,
          end: dateStr,
          type: 'completed',
          projectId: project.id,
          color: EVENT_COLORS.completed,
        });
      }
    }
  }

  // Sort chronologically
  events.sort((a, b) => a.start.localeCompare(b.start));

  return events;
}
