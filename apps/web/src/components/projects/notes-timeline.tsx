import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PhotoGallery } from './photo-gallery';
import { AddNoteForm } from './add-note-form';
import { formatDate } from '@/lib/formatters';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import type { NoteDTO } from '@fencetastic/shared';

interface NotesTimelineProps {
  projectId: string;
  notes: NoteDTO[];
  currentUserId: string;
  onCreateNote: (dto: { content: string; photoUrls: string[] }) => Promise<void>;
  onUpdateNote: (id: string, content: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  uploadPhoto: (projectId: string, file: File) => Promise<string>;
}

export function NotesTimeline({
  projectId,
  notes,
  currentUserId,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  uploadPhoto,
}: NotesTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  function startEdit(note: NoteDTO) {
    setEditingId(note.id);
    setEditContent(note.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent('');
  }

  async function saveEdit(id: string) {
    if (!editContent.trim()) return;
    setSavingId(id);
    try {
      await onUpdateNote(id, editContent.trim());
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    setSavingId(id);
    try {
      await onDeleteNote(id);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add note form */}
        <AddNoteForm
          projectId={projectId}
          onSubmit={onCreateNote}
          uploadPhoto={uploadPhoto}
        />

        {notes.length > 0 && <Separator />}

        {/* Timeline */}
        <div className="space-y-4">
          {notes.map((note) => {
            const isOwn = note.authorId === currentUserId;
            const isSaving = savingId === note.id;

            return (
              <div key={note.id} className="space-y-1.5">
                {/* Author + timestamp row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold select-none">
                      {note.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{note.authorName}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDate(note.createdAt.split('T')[0])}
                        {' · '}
                        {new Date(note.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {isOwn && editingId !== note.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(note)}
                        disabled={isSaving}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(note.id)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Content */}
                {editingId === note.id ? (
                  <div className="space-y-2 pl-9">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(note.id)}
                        disabled={isSaving || !editContent.trim()}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {isSaving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isSaving}>
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pl-9">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <PhotoGallery urls={note.photoUrls} altPrefix="Note photo" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No notes yet. Add one above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
