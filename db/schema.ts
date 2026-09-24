import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

// PDFs / notes available in the PDF Library. The actual file bytes live in
// Netlify Blobs (see netlify/functions/pdfs.mts); this table stores metadata
// plus the blob key needed to fetch the file back.
export const pdfs = pgTable("pdfs", {
  id: serial().primaryKey(),
  title: text().notNull(),
  category: text().notNull(), // notes | current | papers | syllabus
  exam: text().notNull().default("All"),
  description: text().notNull().default(""),
  pages: integer("pages").notNull().default(0),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  contentType: text("content_type").notNull().default("application/pdf"),
  blobKey: text("blob_key").notNull(),
  downloads: integer("downloads").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Study Material courses shown on the Study Material page. Each course has
// a body of written notes (content) that students actually read.
export const materials = pgTable("materials", {
  id: serial().primaryKey(),
  title: text().notNull(),
  category: text().notNull(), // class6-12 | bcom | ssc | cgl | chsl | mts | upsc | banking | railway | haryana | state
  icon: text("icon").notNull().default("fa-book"),
  color: text("color").notNull().default("#6366f1"),
  content: text().notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blog posts shown on the Blog page.
export const blogPosts = pgTable("blog_posts", {
  id: serial().primaryKey(),
  title: text().notNull(),
  category: text().notNull().default("Exam Tips"),
  excerpt: text().notNull().default(""),
  content: text().notNull().default(""),
  readTime: text("read_time").notNull().default("5 min"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contact form submissions, visible to admins.
export const messages = pgTable("messages", {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  subject: text().notNull().default(""),
  message: text().notNull(),
  read: boolean().notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
