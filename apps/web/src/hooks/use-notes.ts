import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { NoteDTO } from '@fencetastic/shared';

interface UseNotesReturn {
  data: NoteDTO[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  createNote: (dto: { content: string; photoUrls?: string[] }) => Promise<void>;
  updateNote: (id: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  uploadPhoto: (projectId: string, file: File) => Promise<string>;
}

export function useNotes(projectId: string | undefined): UseNotesReturn {
  const [data, setData] = useState<NoteDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!projectId) return;
    try {
      setError(null);
      setIsLoading(true);
      const res = await api.get(`/projects/${projectId}/notes`);
      setData(res.data.data ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load notes';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(
    async (dto: { content: string; photoUrls?: string[] }) => {
      await api.post(`/projects/${projectId}/notes`, dto);
      await fetchNotes();
    },
    [projectId, fetchNotes]
  );

  const updateNote = useCallback(
    async (id: string, content: string) => {
      await api.patch(`/notes/${id}`, { content });
      await fetchNotes();
    },
    [fetchNotes]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      await api.delete(`/notes/${id}`);
      await fetchNotes();
    },
    [fetchNotes]
  );

  const uploadPhoto = useCallback(
    async (pid: string, file: File): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/upload?projectId=${pid}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data.url as string;
    },
    []
  );

  return { data, isLoading, error, refetch: fetchNotes, createNote, updateNote, deleteNote, uploadPhoto };
}
