import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus } from 'lucide-react';

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage all your fencing projects.</p>
        </div>
        <Button className="bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-90"><Plus className="h-4 w-4 mr-2" />New Project</Button>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <Badge variant="secondary" className="mb-2">Phase 2</Badge>
          <p className="text-muted-foreground">Filterable project data table with status badges coming in the next phase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
