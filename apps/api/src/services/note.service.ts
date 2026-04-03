import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import type { CreateNoteDTO, UpdateNoteDTO, NoteDTO } from '@fencetastic/shared';

function serializeNote(
  n: {
    id: string;
    projectId: string;
    authorId: string;
    content: string;
    photoUrls: string[];
    createdAt: Date;
    author: { id: string; name: string };
  }
): NoteDTO {
  return {
    id: n.id,
    projectId: n.projectId,
    authorId: n.authorId,
    authorName: n.author.name,
    content: n.content,
    photoUrls: n.photoUrls,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function listNotes(projectId: string): Promise<NoteDTO[]> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  const notes = await prisma.projectNote.findMany({
    where: { projectId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return notes.map(serializeNote);
}

export async function createNote(
  projectId: string,
  dto: CreateNoteDTO,
  authorId: string
): Promise<NoteDTO> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.isDeleted) {
    throw new AppError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  const note = await prisma.projectNote.create({
    data: {
      projectId,
      authorId,
      content: dto.content,
      photoUrls: dto.photoUrls ?? [],
    },
    include: { author: { select: { id: true, name: true } } },
  });

  return serializeNote(note);
}

export async function updateNote(
  noteId: string,
  dto: UpdateNoteDTO,
  requestingUserId: string
): Promise<NoteDTO> {
  const existing = await prisma.projectNote.findUnique({
    where: { id: noteId },
    include: { author: { select: { id: true, name: true } } },
  });
  if (!existing) {
    throw new AppError(404, 'Note not found', 'NOTE_NOT_FOUND');
  }
  if (existing.authorId !== requestingUserId) {
    throw new AppError(403, 'You can only edit your own notes', 'FORBIDDEN');
  }

  const updated = await prisma.projectNote.update({
    where: { id: noteId },
    data: { content: dto.content },
    include: { author: { select: { id: true, name: true } } },
  });

  return serializeNote(updated);
}

export async function deleteNote(noteId: string, requestingUserId: string): Promise<void> {
  const existing = await prisma.projectNote.findUnique({ where: { id: noteId } });
  if (!existing) {
    throw new AppError(404, 'Note not found', 'NOTE_NOT_FOUND');
  }
  if (existing.authorId !== requestingUserId) {
    throw new AppError(403, 'You can only delete your own notes', 'FORBIDDEN');
  }
  await prisma.projectNote.delete({ where: { id: noteId } });
}
