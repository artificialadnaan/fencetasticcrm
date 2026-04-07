export interface CalendarEventView {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  projectId: string;
  color: string;
  notes?: string | null;
  projectCustomer?: string;
  projectAddress?: string;
  searchText: string;
}
