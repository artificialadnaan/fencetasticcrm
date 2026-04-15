import type { FinanceTrustOverview, FinanceTrustProjectRow } from '@fencetastic/shared';

interface FinanceTrustSectionProps {
  data: FinanceTrustOverview | null;
  isLoading: boolean;
  error: string | null;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function queueRowSubtitle(project: FinanceTrustProjectRow) {
  const importedLabel = project.importedSource ? `Imported from ${project.importedSource}` : 'CRM-native';
  return `${project.address} • ${importedLabel}`;
}

function TrustQueue({
  title,
  description,
  projects,
  emptyState,
}: {
  title: string;
  description: string;
  projects: FinanceTrustProjectRow[];
  emptyState: string;
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
          {projects.length}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {projects.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            {emptyState}
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="rounded-[20px] border border-black/5 bg-slate-50 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{project.customer}</p>
                  <p className="mt-1 text-sm text-slate-600">{queueRowSubtitle(project)}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                  {project.financeTrust.projectMode.split('_').join(' ')}
                </span>
              </div>
              {(project.reconciliationNotes || project.lastManualFinanceEditAt || project.importedAt) && (
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  {project.reconciliationNotes && <p>{project.reconciliationNotes}</p>}
                  {project.lastManualFinanceEditAt && (
                    <p>Last manual finance edit: {formatDateTime(project.lastManualFinanceEditAt)}</p>
                  )}
                  {project.importedAt && (
                    <p>Imported: {formatDateTime(project.importedAt)}</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function FinanceTrustSection({ data, isLoading, error }: FinanceTrustSectionProps) {
  if (error) {
    return (
      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Finance Trust
        </p>
        <div className="mt-4 rounded-[20px] border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          Failed to load finance trust data.
        </div>
      </section>
    );
  }

  const summary = data?.summary;

  return (
    <section className="shell-panel rounded-[28px] p-6 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Finance Trust
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            Imported vs computed finance state
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Monitor imported historical jobs, manual overrides, reconciliation warnings, and the latest spreadsheet sync state from one admin surface.
          </p>
        </div>
        <div className="rounded-[24px] border border-black/5 bg-slate-950 px-5 py-4 text-white">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
            Last spreadsheet import
          </p>
          <p className="mt-2 text-lg font-semibold">
            {isLoading ? 'Loading…' : formatDateTime(summary?.lastImportedAt ?? null)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Imported projects', summary?.importedProjects ?? 0],
          ['Computed projects', summary?.computedProjects ?? 0],
          ['Manual overrides', summary?.manualOverrideProjects ?? 0],
          ['Projects needing reconciliation', summary?.reconciliationRequiredProjects ?? 0],
          ['Projects with imported finance', summary?.projectsWithImportedFinance ?? 0],
          ['Projects with manual finance edits', summary?.projectsWithManualFinanceEdits ?? 0],
          ['Mixed-mode projects', summary?.mixedProjects ?? 0],
          ['Total tracked projects', summary?.totalProjects ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[24px] border border-black/5 bg-white/70 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {isLoading ? '—' : value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <TrustQueue
          title="Projects needing reconciliation"
          description="Imported jobs where the spreadsheet record and CRM record still need a human decision before the finance state can be trusted."
          projects={data?.reconciliationQueue ?? []}
          emptyState="No projects are currently marked for reconciliation."
        />
        <TrustQueue
          title="Manual finance overrides"
          description="Projects where imported or computed values were manually adjusted and should be reviewed before being treated as canonical."
          projects={data?.manualOverrideQueue ?? []}
          emptyState="No manual finance overrides are active right now."
        />
        <TrustQueue
          title="Recent imports"
          description="Latest spreadsheet-sourced projects, ordered by import time, so you can spot-check what was last synced."
          projects={data?.recentImports ?? []}
          emptyState="No imported projects have been recorded yet."
        />
      </div>
    </section>
  );
}
