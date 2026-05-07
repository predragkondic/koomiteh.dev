CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE OR REPLACE FUNCTION immutable_array_to_string(arr text[], sep text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT array_to_string(arr, sep) $$;--> statement-breakpoint
CREATE TYPE "public"."post_level" AS ENUM('junior', 'senior');--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" text NOT NULL,
	"slug" text NOT NULL,
	"question" text NOT NULL,
	"language" text NOT NULL,
	"level" "post_level" NOT NULL,
	"tags" text[] NOT NULL,
	"body_md" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"search_vector" tsvector GENERATED ALWAYS AS (
		setweight(to_tsvector('english'::regconfig, coalesce("question", '')), 'A') ||
		setweight(to_tsvector('english'::regconfig, immutable_array_to_string(coalesce("tags", '{}'::text[]), ' ')), 'B') ||
		setweight(to_tsvector('english'::regconfig, coalesce("body_md", '')), 'C')
	) STORED
);
--> statement-breakpoint
CREATE UNIQUE INDEX "posts_content_id_idx" ON "posts" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "posts_language_idx" ON "posts" USING btree ("language");--> statement-breakpoint
CREATE INDEX "posts_level_idx" ON "posts" USING btree ("level");--> statement-breakpoint
CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_search_idx" ON "posts" USING GIN ("search_vector");--> statement-breakpoint
CREATE INDEX "posts_tags_idx" ON "posts" USING GIN ("tags");--> statement-breakpoint
CREATE INDEX "posts_question_trgm_idx" ON "posts" USING GIN ("question" gin_trgm_ops);
