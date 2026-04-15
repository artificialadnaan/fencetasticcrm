import { AlertOctagon, CreditCard, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FinanceRiskOverview } from '@fencetastic/shared';
import { formatCurrency } from '@/lib/formatters';

interface DashboardCashRiskStripProps {
  risk: FinanceRiskOverview | null;
  isLoading: boolean;
  error?: string | null;
}

interface RiskCardProps {
  label: string;
  value: string;
  detail: string;
  href: string;
  Icon: typeof Wallet;
}

function RiskSkeleton() {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
      <div className="h-3 w-24 animate-pulse rounded-full bg-white/14" />
      <div className="mt-3 h-8 w-28 animate-pulse rounded-full bg-white/12" />
      <div className="mt-3 h-3 w-36 animate-pulse rounded-full bg-white/10" />
    </div>
  );
}

function RiskCard({ label, value, detail, href, Icon }: RiskCardProps) {
  return (
    <Link
      to={href}
      className="rounded-[24px] border border-white/10 bg-[#0f151d] p-5 text-white shadow-[0_18px_48px_rgba(0,0,0,0.26)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>
        </div>
        <div className="rounded-2xl border border-white/12 bg-white/10 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

export function DashboardCashRiskStrip({ risk, isLoading, error }: DashboardCashRiskStripProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <RiskSkeleton key={item} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-rose-400/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
        Failed to load cash-risk data: {error}
      </div>
    );
  }

  if (!risk) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <RiskCard
        label="Receivables Aging"
        value={formatCurrency(risk.receivables.overallOutstanding)}
        detail={`${formatCurrency(risk.receivables.over60Outstanding)} is older than 60 days.`}
        href="/finances"
        Icon={AlertOctagon}
      />
      <RiskCard
        label="Commissions Due"
        value={formatCurrency(risk.payables.outstandingCommissions)}
        detail={`${risk.payables.projectCount} active jobs still carry unpaid commission balance.`}
        href="/commissions"
        Icon={Wallet}
      />
      <RiskCard
        label="Debt Movement 30D"
        value={formatCurrency(risk.debt.netMovementLast30Days)}
        detail={`${formatCurrency(risk.debt.paidDownLast30Days)} paid down with ${formatCurrency(risk.debt.adjustmentsLast30Days)} in adjustments.`}
        href="/commissions"
        Icon={CreditCard}
      />
    </div>
  );
}
