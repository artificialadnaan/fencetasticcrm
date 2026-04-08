import {
  EstimateFollowUpSequenceStatus,
  EstimateFollowUpTaskKind,
  EstimateFollowUpTaskStatus,
} from '@fencetastic/shared';
import { prisma } from '../lib/prisma';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date string YYYY-MM-DD
  end: string;   // same as start for single-day events
  type: string;
  projectId: string;
  color: string;
  notes?: string | null;
}

const EVENT_COLORS = {
  estimate: '#3B82F6',  // blue
  followup: '#F59E0B',  // amber
  install: '#10B981',   // green
  completed: '#6B7280', // gray
} as const;

type CalendarFollowUpTaskRow = {
  id: string;
  projectId: string;
  kind: EstimateFollowUpTaskKind;
  dueDate: Date;
  status: EstimateFollowUpTaskStatus;
  notes: string | null;
  sequence: {
    status: EstimateFollowUpSequenceStatus;
  };
  project: {
    id: string;
    customer: string;
    isDeleted: boolean;
  };
};

type CalendarFollowUpTaskClient = {
  estimateFollowUpTask: {
    findMany: (args: {
      where: {
        status: EstimateFollowUpTaskStatus;
        dueDate: {
          gte: Date;
          lt: Date;
        };
        sequence: {
          status: EstimateFollowUpSequenceStatus;
        };
        project: {
          isDeleted: false;
        };
      };
      select: {
        id: true;
        projectId: true;
        kind: true;
        dueDate: true;
        status: true;
        notes: true;
        sequence: {
          select: {
            status: true;
          };
        };
        project: {
          select: {
            id: true;
            customer: true;
            isDeleted: true;
          };
        };
      };
      orderBy: {
        dueDate: 'asc';
      };
    }) => Promise<CalendarFollowUpTaskRow[]>;
  };
};

function isCalendarFollowUpTaskVisible(task: CalendarFollowUpTaskRow) {
  return (
    task.status === EstimateFollowUpTaskStatus.PENDING
    && task.sequence.status === EstimateFollowUpSequenceStatus.ACTIVE
    && !task.project.isDeleted
  );
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function getCalendarEvents(
  start: string,
  end: string
): Promise<CalendarEvent[]> {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const followUpTaskClient = prisma as unknown as CalendarFollowUpTaskClient;
  // Extend end by 1 day to make the range inclusive
  endDate.setDate(endDate.getDate() + 1);

  const [projects, followUpTasks, customEvents] = await Promise.all([
    prisma.project.findMany({
      where: {
        isDeleted: false,
        OR: [
          { estimateDate: { gte: startDate, lt: endDate } },
          { installDate: { gte: startDate, lt: endDate } },
          { completedDate: { gte: startDate, lt: endDate } },
        ],
      },
      select: {
        id: true,
        customer: true,
        estimateDate: true,
        installDate: true,
        completedDate: true,
      },
    }),
    followUpTaskClient.estimateFollowUpTask.findMany({
      where: {
        status: EstimateFollowUpTaskStatus.PENDING,
        dueDate: { gte: startDate, lt: endDate },
        sequence: {
          status: EstimateFollowUpSequenceStatus.ACTIVE,
        },
        project: {
          isDeleted: false,
        },
      },
      select: {
        id: true,
        projectId: true,
        kind: true,
        dueDate: true,
        status: true,
        notes: true,
        sequence: {
          select: {
            status: true,
          },
        },
        project: {
          select: {
            id: true,
            customer: true,
            isDeleted: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.calendarEvent.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
      include: { project: { select: { customer: true } } },
    }),
  ]);

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
          notes: null,
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
          notes: null,
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
          notes: null,
        });
      }
    }
  }

  for (const task of followUpTasks) {
    if (!isCalendarFollowUpTaskVisible(task)) {
      continue;
    }

    const dateStr = toDateStr(task.dueDate);
    events.push({
      id: `followup-${task.id}`,
      title: `${task.project.customer} — Follow-Up`,
      start: dateStr,
      end: dateStr,
      type: 'followup',
      projectId: task.projectId,
      color: EVENT_COLORS.followup,
      notes: task.notes,
    });
  }

  for (const ce of customEvents) {
    events.push({
      id: ce.id,
      title: ce.title,
      start: toDateStr(ce.date),
      end: ce.endDate ? toDateStr(ce.endDate) : toDateStr(ce.date),
      type: ce.eventType,
      projectId: ce.projectId ?? '',
      color: ce.color,
      notes: ce.notes,
    });
  }

  // Sort chronologically
  events.sort((a, b) => a.start.localeCompare(b.start));

  return events;
}
