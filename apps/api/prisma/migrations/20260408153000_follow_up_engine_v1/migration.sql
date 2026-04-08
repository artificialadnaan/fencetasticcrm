-- CreateEnum
CREATE TYPE "EstimateFollowUpSequenceStatus" AS ENUM ('ACTIVE', 'WON', 'LOST', 'CLOSED');

-- CreateEnum
CREATE TYPE "EstimateFollowUpTaskKind" AS ENUM ('DAY_1', 'DAY_3', 'DAY_7', 'DAY_14');

-- CreateEnum
CREATE TYPE "EstimateFollowUpTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EstimateFollowUpLostReasonCode" AS ENUM (
    'PRICE',
    'NO_RESPONSE',
    'CHOSE_COMPETITOR',
    'TIMING',
    'FINANCING',
    'SCOPE_MISMATCH',
    'DUPLICATE_BAD_LEAD',
    'OTHER'
);

-- CreateTable
CREATE TABLE "estimate_follow_up_sequences" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "status" "EstimateFollowUpSequenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,
    "closed_summary" TEXT,
    "lost_reason_code" "EstimateFollowUpLostReasonCode",
    "lost_reason_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "estimate_follow_up_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_follow_up_tasks" (
    "id" UUID NOT NULL,
    "sequence_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "kind" "EstimateFollowUpTaskKind" NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "EstimateFollowUpTaskStatus" NOT NULL DEFAULT 'PENDING',
    "draft_subject" TEXT NOT NULL,
    "draft_body" TEXT NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "completed_by_user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "estimate_follow_up_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estimate_follow_up_sequences_id_project_id_key"
ON "estimate_follow_up_sequences"("id", "project_id");

-- CreateIndex
CREATE INDEX "estimate_follow_up_sequences_project_id_status_idx"
ON "estimate_follow_up_sequences"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "estimate_follow_up_tasks_sequence_id_kind_key"
ON "estimate_follow_up_tasks"("sequence_id", "kind");

-- CreateIndex
CREATE INDEX "estimate_follow_up_tasks_status_due_date_idx"
ON "estimate_follow_up_tasks"("status", "due_date");

-- CreateIndex
CREATE INDEX "estimate_follow_up_tasks_project_id_status_due_date_idx"
ON "estimate_follow_up_tasks"("project_id", "status", "due_date");

-- AddForeignKey
ALTER TABLE "estimate_follow_up_sequences"
ADD CONSTRAINT "estimate_follow_up_sequences_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_follow_up_tasks"
ADD CONSTRAINT "estimate_follow_up_tasks_sequence_id_project_id_fkey"
FOREIGN KEY ("sequence_id", "project_id")
REFERENCES "estimate_follow_up_sequences"("id", "project_id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_follow_up_tasks"
ADD CONSTRAINT "estimate_follow_up_tasks_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_follow_up_tasks"
ADD CONSTRAINT "estimate_follow_up_tasks_completed_by_user_id_fkey"
FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
