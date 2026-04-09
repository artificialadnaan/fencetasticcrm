-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('LUMBER', 'CONCRETE', 'HARDWARE', 'FASTENERS', 'GATES', 'PANELS', 'OTHER');

-- AlterTable: add subcategory to transactions
ALTER TABLE "transactions" ADD COLUMN "subcategory" TEXT;

-- AlterTable: add effectiveFrom/effectiveTo to operating_expenses
ALTER TABLE "operating_expenses" ADD COLUMN "effective_from" DATE;
ALTER TABLE "operating_expenses" ADD COLUMN "effective_to" DATE;

-- CreateTable
CREATE TABLE "material_line_items" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "category" "MaterialCategory" NOT NULL,
    "vendor" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "purchase_date" DATE NOT NULL,
    "transaction_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "material_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_line_items_project_id_idx" ON "material_line_items"("project_id");

-- CreateIndex
CREATE INDEX "material_line_items_purchase_date_idx" ON "material_line_items"("purchase_date");

-- CreateIndex
CREATE INDEX "material_line_items_transaction_id_idx" ON "material_line_items"("transaction_id");

-- CreateIndex
CREATE INDEX "material_line_items_category_idx" ON "material_line_items"("category");

-- CreateIndex
CREATE INDEX "transactions_date_type_idx" ON "transactions"("date", "type");

-- CreateIndex
CREATE INDEX "transactions_project_id_type_idx" ON "transactions"("project_id", "type");

-- CreateIndex
CREATE INDEX "commission_snapshots_settled_at_idx" ON "commission_snapshots"("settled_at");

-- AddForeignKey
ALTER TABLE "material_line_items"
ADD CONSTRAINT "material_line_items_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_line_items"
ADD CONSTRAINT "material_line_items_transaction_id_fkey"
FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
