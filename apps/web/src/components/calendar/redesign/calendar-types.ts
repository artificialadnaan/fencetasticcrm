export interface CalendarEventView {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  projectId: string;
  color: string;
  notes?: string | null;
  isWorkflowTask?: boolean;
  taskStatus?: 'PENDING' | 'COMPLETED' | null;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
  completedAt?: string | null;
  projectCustomer?: string;
  projectAddress?: string;
  searchText: string;
}
