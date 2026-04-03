import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '@/hooks/use-project';
import { useSubcontractors } from '@/hooks/use-subcontractors';
import { useNotes } from '@/hooks/use-notes';
import { useAuth } from '@/lib/auth-context';
import { ProjectHeader } from '@/components/projects/project-header';
import { ProjectFinancialsCard } from '@/components/projects/project-financials-card';
import { ProjectScheduleCard } from '@/components/projects/project-schedule-card';
import { ProjectInfoCard } from '@/components/projects/project-info-card';
import { SubcontractorTable } from '@/components/projects/subcontractor-table';
import { NotesTimeline } from '@/components/projects/notes-timeline';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileEdit } from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { project, isLoading, error, refetch } = useProject(id);
  const { user } = useAuth();

  const {
    data: subs,
    addSub,
    updateSub,
    deleteSub,
  } = useSubcontractors(id);

  const {
    data: notes,
    createNote,
    updateNote,
    deleteNote,
    uploadPhoto,
  } = useNotes(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-[300px]" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error || 'Project not found'}</p>
        </CardContent>
      </Card>
    );
  }

  const isSnapshot = project.status === 'COMPLETED' && project.commissionSnapshot !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ProjectHeader
          projectId={project.id}
          customer={project.customer}
          address={project.address}
          status={project.status}
          onStatusChange={refetch}
        />
        <Button variant="outline" onClick={() => navigate(`/projects/${id}/work-order`)}>
          <FileEdit className="h-4 w-4 mr-1" />
          Work Order
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ProjectFinancialsCard
          projectTotal={project.projectTotal}
          paymentMethod={project.paymentMethod}
          commissionPreview={project.commissionPreview}
          isSnapshot={isSnapshot}
        />

        <div className="space-y-4">
          <ProjectScheduleCard
            contractDate={project.contractDate}
            installDate={project.installDate}
            estimateDate={project.estimateDate}
            followUpDate={project.followUpDate}
            completedDate={project.completedDate}
          />

          <ProjectInfoCard
            description={project.description}
            fenceType={project.fenceType}
            subcontractor={project.subcontractor}
            linearFeet={project.linearFeet}
            customerPaid={project.customerPaid}
            forecastedExpenses={project.forecastedExpenses}
            notes={project.notes}
          />
        </div>
      </div>

      {/* Subcontractor Payments */}
      <SubcontractorTable
        projectId={project.id}
        subs={subs}
        onAdd={addSub}
        onUpdate={updateSub}
        onDelete={deleteSub}
        onDataChange={refetch}
      />

      {/* Notes Timeline */}
      <NotesTimeline
        projectId={project.id}
        notes={notes}
        currentUserId={user?.id ?? ''}
        onCreateNote={createNote}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
        uploadPhoto={uploadPhoto}
      />
    </div>
  );
}
