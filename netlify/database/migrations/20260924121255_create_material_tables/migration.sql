CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"category" text DEFAULT 'Exam Tips' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"read_time" text DEFAULT '5 min' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"icon" text DEFAULT 'fa-book' NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdfs" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"exam" text DEFAULT 'All' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"pages" integer DEFAULT 0 NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"content_type" text DEFAULT 'application/pdf' NOT NULL,
	"blob_key" text NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
