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
export const STATUS_COLORS: Record<string, string> = {
  ESTIMATE: 'gray',
  OPEN: 'amber',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
} as const;

/** Sidebar navigation items */
export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Projects', path: '/projects', icon: 'FolderOpen' },
  { label: 'Calendar', path: '/calendar', icon: 'Calendar' },
  { label: 'Commissions', path: '/commissions', icon: 'DollarSign' },
  { label: 'Reports', path: '/reports', icon: 'BarChart3' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
] as const;
