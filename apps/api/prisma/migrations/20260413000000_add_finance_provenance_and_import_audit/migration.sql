DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinanceProjectMode') THEN
    CREATE TYPE "FinanceProjectMode" AS ENUM (
      'IMPORTED',
      'COMPUTED',
      'MANUAL_OVERRIDE',
      'MIXED',
      'RECONCILIATION_REQUIRED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinanceSubdomainSource') THEN
    CREATE TYPE "FinanceSubdomainSource" AS ENUM (
      'IMPORTED_ACTUAL',
      'CRM_COMPUTED',
      'MANUAL_OVERRIDE',
      'RECONCILIATION_REQUIRED'
    );
  END IF;
END $$;

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "finance_project_mode" "FinanceProjectMode" NOT NULL DEFAULT 'COMPUTED',
  ADD COLUMN IF NOT EXISTS "receivables_source" "FinanceSubdomainSource" NOT NULL DEFAULT 'CRM_COMPUTED',
  ADD COLUMN IF NOT EXISTS "payables_source" "FinanceSubdomainSource" NOT NULL DEFAULT 'CRM_COMPUTED',
  ADD COLUMN IF NOT EXISTS "commissions_source" "FinanceSubdomainSource" NOT NULL DEFAULT 'CRM_COMPUTED',
  ADD COLUMN IF NOT EXISTS "profitability_source" "FinanceSubdomainSource" NOT NULL DEFAULT 'CRM_COMPUTED',
  ADD COLUMN IF NOT EXISTS "imported_outstanding_receivables" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "imported_outstanding_payables" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "imported_gross_profit" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "imported_gross_profit_percent" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "imported_net_profit" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "imported_net_profit_percent" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "imported_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "imported_source" TEXT,
  ADD COLUMN IF NOT EXISTS "last_recalculated_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "last_manual_finance_edit_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "reconciliation_required_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "reconciliation_notes" TEXT;

CREATE INDEX IF NOT EXISTS "projects_finance_project_mode_idx"
  ON "projects"("finance_project_mode");

CREATE INDEX IF NOT EXISTS "projects_status_finance_project_mode_idx"
  ON "projects"("status", "finance_project_mode");
