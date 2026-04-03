-- CreateEnum
CREATE TYPE "FenceType" AS ENUM ('WOOD', 'METAL', 'CHAIN_LINK', 'VINYL', 'GATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ESTIMATE', 'OPEN', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHECK', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "ExpenseFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "customer" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fence_type" "FenceType" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ESTIMATE',
    "project_total" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "money_received" DECIMAL(10,2) NOT NULL,
    "customer_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "forecasted_expenses" DECIMAL(10,2) NOT NULL,
    "materials_cost" DECIMAL(10,2) NOT NULL,
    "contract_date" DATE NOT NULL,
    "install_date" DATE NOT NULL,
    "completed_date" DATE,
    "estimate_date" DATE,
    "follow_up_date" DATE,
    "linear_feet" DECIMAL(10,2),
    "rate_template_id" UUID,
    "subcontractor" TEXT,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_payments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "subcontractor_name" TEXT NOT NULL,
    "amount_owed" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "date_paid" DATE,
    "notes" TEXT,

    CONSTRAINT "subcontractor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_notes" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "photo_urls" TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_templates" (
    "id" UUID NOT NULL,
    "fence_type" "FenceType" NOT NULL,
    "name" TEXT NOT NULL,
    "rate_per_foot" DECIMAL(10,2) NOT NULL,
    "labor_rate_per_foot" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aimann_debt_ledger" (
    "id" UUID NOT NULL,
    "project_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "running_balance" DECIMAL(10,2) NOT NULL,
    "note" TEXT NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "aimann_debt_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_snapshots" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "money_received" DECIMAL(10,2) NOT NULL,
    "total_expenses" DECIMAL(10,2) NOT NULL,
    "adnaan_commission" DECIMAL(10,2) NOT NULL,
    "meme_commission" DECIMAL(10,2) NOT NULL,
    "gross_profit" DECIMAL(10,2) NOT NULL,
    "aimann_deduction" DECIMAL(10,2) NOT NULL,
    "debt_balance_before" DECIMAL(10,2) NOT NULL,
    "debt_balance_after" DECIMAL(10,2) NOT NULL,
    "net_profit" DECIMAL(10,2) NOT NULL,
    "settled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_expenses" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "frequency" "ExpenseFrequency" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "operating_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "commission_snapshots_project_id_key" ON "commission_snapshots"("project_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_rate_template_id_fkey" FOREIGN KEY ("rate_template_id") REFERENCES "rate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_payments" ADD CONSTRAINT "subcontractor_payments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aimann_debt_ledger" ADD CONSTRAINT "aimann_debt_ledger_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_snapshots" ADD CONSTRAINT "commission_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
