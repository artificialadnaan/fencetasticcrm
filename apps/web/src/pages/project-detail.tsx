import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/use-project';
import { ProjectHeader } from '@/components/projects/project-header';
import { ProjectFinancialsCard } from '@/components/projects/project-financials-card';
import { ProjectScheduleCard } from '@/components/projects/project-schedule-card';
import { ProjectInfoCard } from '@/components/projects/project-info-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { project, isLoading, error, refetch } = useProject(id);

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
      <ProjectHeader
        projectId={project.id}
        customer={project.customer}
        address={project.address}
        status={project.status}
        onStatusChange={refetch}
      />

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
    </div>
  );
}
