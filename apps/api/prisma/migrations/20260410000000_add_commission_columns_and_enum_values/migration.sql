-- Add missing enum values to ProjectStatus
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'CLOSED';
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'WARRANTY';

-- Add missing enum values to PaymentMethod
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ZELLE';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'FINANCING';

-- Add missing commission columns to projects table
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "commission_owed" DECIMAL(10,2);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "commission_paid" DECIMAL(10,2);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "memes_commission" DECIMAL(10,2);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "aimanns_commission" DECIMAL(10,2);
