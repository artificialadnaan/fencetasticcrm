DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowTaskStatus') THEN
    CREATE TYPE "WorkflowTaskStatus" AS ENUM (
      'PENDING',
      'COMPLETED'
    );
  END IF;
END $$;

ALTER TABLE "calendar_events"
  ADD COLUMN IF NOT EXISTS "is_workflow_task" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "task_status" "WorkflowTaskStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "assigned_to_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'calendar_events_assigned_to_user_id_fkey'
      AND table_name = 'calendar_events'
  ) THEN
    ALTER TABLE "calendar_events"
      ADD CONSTRAINT "calendar_events_assigned_to_user_id_fkey"
      FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "calendar_events_is_workflow_task_task_status_date_idx"
  ON "calendar_events"("is_workflow_task", "task_status", "date");

CREATE INDEX IF NOT EXISTS "calendar_events_project_id_is_workflow_task_task_status_date_idx"
  ON "calendar_events"("project_id", "is_workflow_task", "task_status", "date");
