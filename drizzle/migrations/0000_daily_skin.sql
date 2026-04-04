CREATE TYPE "public"."activity_category" AS ENUM('scholarship', 'competition', 'extracurricular', 'research', 'self_learning', 'green_ethics');--> statement-breakpoint
CREATE TYPE "public"."opportunity_scope" AS ENUM('international', 'national', 'regional');--> statement-breakpoint
CREATE TYPE "public"."opportunity_type" AS ENUM('competition', 'scholarship', 'workshop', 'summer_program');--> statement-breakpoint
CREATE TYPE "public"."target_major" AS ENUM('cntt', 'toan_thong_ke');--> statement-breakpoint
CREATE TABLE "activities" (
	"activity_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "activity_category" NOT NULL,
	"title" varchar(200) NOT NULL,
	"star_situation" text NOT NULL,
	"star_task" text NOT NULL,
	"star_action" text NOT NULL,
	"star_result" text NOT NULL,
	"trust_tier" integer DEFAULT 1 NOT NULL,
	"trust_verified_by" varchar(200),
	"tech_tags" text[],
	"base_score" numeric(2, 1),
	"slot_order" integer,
	"artifact_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"performed_by" varchar(200),
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_connections" (
	"connection_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"consented" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentors" (
	"mentor_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"school" varchar(200) NOT NULL,
	"major" varchar(200) NOT NULL,
	"expertise_tags" text[],
	"bio" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"rating" numeric(2, 1),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"opp_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" "opportunity_type" NOT NULL,
	"field_tags" text[] NOT NULL,
	"scope" "opportunity_scope" NOT NULL,
	"is_online" boolean NOT NULL,
	"is_free" boolean NOT NULL,
	"deadline" timestamp NOT NULL,
	"source_url" varchar(500) NOT NULL,
	"description" text,
	"admin_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_personas" (
	"school_id" varchar(50) PRIMARY KEY NOT NULL,
	"school_name" varchar(200) NOT NULL,
	"short_name" varchar(50) NOT NULL,
	"min_sat" integer,
	"min_gpa" numeric(3, 1) NOT NULL,
	"min_ielts" numeric(2, 1) NOT NULL,
	"has_interview" boolean NOT NULL,
	"min_portfolio_activities" integer NOT NULL,
	"preferred_categories" text[],
	"persona_description" text,
	"source_doc" varchar(300),
	"source_page" varchar(50),
	"effective_year" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"grade" integer NOT NULL,
	"school_name" varchar(200) NOT NULL,
	"province" varchar(100) NOT NULL,
	"gpa" numeric(3, 1),
	"sat_score" integer,
	"ielts_score" numeric(2, 1),
	"target_major" "target_major",
	"target_schools" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_user_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_connections" ADD CONSTRAINT "mentor_connections_student_id_user_profiles_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_connections" ADD CONSTRAINT "mentor_connections_mentor_id_mentors_mentor_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("mentor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_slot_per_user" ON "activities" USING btree ("user_id","slot_order") WHERE "activities"."slot_order" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "activities_user_idx" ON "activities" USING btree ("user_id");