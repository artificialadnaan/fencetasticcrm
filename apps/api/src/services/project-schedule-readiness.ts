import type {
  ProjectScheduleReadinessBlocker,
  ProjectScheduleReadinessDetail,
  ProjectScheduleReadinessSummary,
} from '@fencetastic/shared';

type ScheduleReadinessInput = {
  customerPaid: number;
  materialsCost: number;
  subcontractor: string | null;
  materialLineItemCount: number;
  workOrderCount: number;
};

export function buildProjectScheduleReadiness(
  input: ScheduleReadinessInput,
): ProjectScheduleReadinessDetail {
  const blockers: ProjectScheduleReadinessBlocker[] = [];

  if (input.customerPaid <= 0) {
    blockers.push({
      code: 'MISSING_DEPOSIT',
      label: 'Deposit',
      reason: 'No customer payment has been recorded yet.',
      severity: 'HIGH',
    });
  }

  if (input.materialLineItemCount <= 0 && input.materialsCost <= 0) {
    blockers.push({
      code: 'MISSING_MATERIALS',
      label: 'Materials',
      reason: 'No materials have been logged for this project.',
      severity: 'HIGH',
    });
  }

  if (!input.subcontractor?.trim()) {
    blockers.push({
      code: 'MISSING_SUBCONTRACTOR',
      label: 'Crew',
      reason: 'No subcontractor has been assigned yet.',
      severity: 'HIGH',
    });
  }

  if (input.workOrderCount <= 0) {
    blockers.push({
      code: 'MISSING_WORK_ORDER',
      label: 'Work order',
      reason: 'No work order has been created for this project.',
      severity: 'MEDIUM',
    });
  }

  return {
    isReady: blockers.length === 0,
    blockerCount: blockers.length,
    topBlockers: blockers.slice(0, 3).map((blocker) => blocker.label),
    blockers,
  };
}

export function toProjectScheduleReadinessSummary(
  detail: ProjectScheduleReadinessDetail,
): ProjectScheduleReadinessSummary {
  return {
    isReady: detail.isReady,
    blockerCount: detail.blockerCount,
    topBlockers: detail.topBlockers,
  };
}

