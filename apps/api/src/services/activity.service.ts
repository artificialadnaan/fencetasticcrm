import { prisma } from '../lib/prisma';
import type { ActivityDTO } from '@fencetastic/shared';

export async function getRecentActivity(limit = 20): Promise<ActivityDTO[]> {
  // Fetch recent notes
  const notes = await prisma.projectNote.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      project: { select: { id: true, customer: true, isDeleted: true } },
      author: { select: { name: true } },
    },
  });

  const activities: ActivityDTO[] = notes
    .filter((n) => !n.project.isDeleted)
    .map((n) => ({
      id: `note-${n.id}`,
      type: 'note_added' as const,
      projectId: n.project.id,
      customer: n.project.customer,
      description: `${n.author.name} added a note: "${n.content.length > 60 ? n.content.slice(0, 60) + '…' : n.content}"`,
      createdAt: n.createdAt.toISOString(),
    }));

  // Sort by most recent and cap at limit
  activities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return activities.slice(0, limit);
}
