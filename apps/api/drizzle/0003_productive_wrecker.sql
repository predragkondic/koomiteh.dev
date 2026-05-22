ALTER TYPE "public"."user_role" ADD VALUE 'superadmin';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp with time zone;