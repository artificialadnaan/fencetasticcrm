import { ProjectStatus } from './types';

// ============================================================
// Fencetastic Shared Constants
// Commission rates, fees, and business rules
// ============================================================

/** Credit card processing fee percentage (3%) — customer pays via CC, we receive 97% */
export const CC_FEE_RATE = 0.03;

/** Adnaan's commission rate — 10% of project total */
export const ADNAAN_COMMISSION_RATE = 0.10;

/** Meme's commission rate — 5% of project total */
export const MEME_COMMISSION_RATE = 0.05;

/** Aimann's debt deduction rate — 25% of gross profit when debt exists */
export const AIMANN_DEDUCTION_RATE = 0.25;

/** Initial Aimann debt balance from Payout sheet */
export const AIMANN_INITIAL_DEBT = 5988.41;

/** JWT token expiry duration */
export const JWT_EXPIRY = '7d';

/** Polling interval for frontend data refresh (milliseconds) */
export const POLLING_INTERVAL_MS = 30_000;

/** Status badge color mapping */
export const STATUS_COLORS: Record<ProjectStatus, string> = {
  [ProjectStatus.ESTIMATE]: 'gray',
  [ProjectStatus.OPEN]: 'amber',
  [ProjectStatus.IN_PROGRESS]: 'blue',
  [ProjectStatus.COMPLETED]: 'green',
  [ProjectStatus.CLOSED]: 'slate',
  [ProjectStatus.WARRANTY]: 'violet',
} as const;

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  ProjectStatus.ESTIMATE,
  ProjectStatus.OPEN,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.COMPLETED,
  ProjectStatus.CLOSED,
  ProjectStatus.WARRANTY,
];

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    badgeClassName: string;
    rowClassName: string;
    lifecycleDateField: 'estimateDate' | 'contractDate' | 'installDate' | 'completedDate' | null;
    lifecycleDateLabel: string | null;
  }
> = {
  [ProjectStatus.ESTIMATE]: {
    label: 'Estimate',
    shortLabel: 'Estimate',
    description: 'Lead is being quoted and follow-up should be tracked.',
    badgeClassName: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100',
    rowClassName: '',
    lifecycleDateField: 'estimateDate',
    lifecycleDateLabel: 'Estimate date',
  },
  [ProjectStatus.OPEN]: {
    label: 'Open',
    shortLabel: 'Open',
    description: 'Contract is active and the job is ready for scheduling and collections.',
    badgeClassName: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
    rowClassName: 'bg-amber-50',
    lifecycleDateField: 'contractDate',
    lifecycleDateLabel: 'Contract date',
  },
  [ProjectStatus.IN_PROGRESS]: {
    label: 'In Progress',
    shortLabel: 'In Progress',
    description: 'Work is underway or install is actively scheduled.',
    badgeClassName: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
    rowClassName: 'bg-blue-50',
    lifecycleDateField: 'installDate',
    lifecycleDateLabel: 'Install date',
  },
  [ProjectStatus.COMPLETED]: {
    label: 'Completed',
    shortLabel: 'Completed',
    description: 'Install is done and commissions and debt deductions are locked from the snapshot.',
    badgeClassName: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
    rowClassName: 'bg-green-50',
    lifecycleDateField: 'completedDate',
    lifecycleDateLabel: 'Completed date',
  },
  [ProjectStatus.CLOSED]: {
    label: 'Closed',
    shortLabel: 'Closed',
    description: 'Project is operationally finished and should only remain for final admin follow-through.',
    badgeClassName: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100',
    rowClassName: 'bg-slate-50',
    lifecycleDateField: null,
    lifecycleDateLabel: null,
  },
  [ProjectStatus.WARRANTY]: {
    label: 'Warranty',
    shortLabel: 'Warranty',
    description: 'Job is in post-completion support and should stay visible for service follow-up.',
    badgeClassName: 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100',
    rowClassName: 'bg-violet-50',
    lifecycleDateField: null,
    lifecycleDateLabel: null,
  },
};

/** Sidebar navigation items */
export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Projects', path: '/projects', icon: 'FolderOpen' },
  { label: 'Calendar', path: '/calendar', icon: 'Calendar' },
  { label: 'Commissions', path: '/commissions', icon: 'DollarSign' },
  { label: 'Reports', path: '/reports', icon: 'BarChart3' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
] as const;
