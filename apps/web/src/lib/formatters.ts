/**
 * Format a number as USD currency.
 * formatCurrency(1234.5) → "$1,234.50"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format an ISO date string to a readable date.
 * formatDate("2026-04-15") → "Apr 15, 2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? `${dateStr}T00:00:00`
    : dateStr;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a percentage with one decimal place.
 * formatPercent(23.5) → "23.5%"
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
