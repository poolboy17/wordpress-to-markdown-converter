import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the schema for WordPress posts that have been converted to Markdown
export const conversions = pgTable("conversions", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  status: text("status").notNull().default("processing"), // processing, completed, failed
  totalPosts: integer("total_posts").default(0),
  processedPosts: integer("processed_posts").default(0),
  options: jsonb("options").notNull(), // Conversion options as JSON
  createdAt: text("created_at").notNull(), // ISO date string
});

// Define the schema for individual markdown posts extracted from the XML
export const markdownPosts = pgTable("markdown_posts", {
  id: serial("id").primaryKey(),
  conversionId: integer("conversion_id").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  content: text("content").notNull(),
  date: text("date").notNull(), // ISO date string
  metadata: jsonb("metadata").notNull(), // Author, categories, tags, etc.
});

// Zod schemas for validation
export const conversionOptionsSchema = z.object({
  preserveImages: z.boolean().default(true),
  processShortcodes: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
  splitFiles: z.boolean().default(true),
  // Content filtering options
  filterLowValueContent: z.boolean().default(false),
  minWordCount: z.number().int().min(0).default(700),
  minTextToHtmlRatio: z.number().min(0).max(1).default(0.5),
  excludeEmbedOnlyPosts: z.boolean().default(true),
  excludeDraftPosts: z.boolean().default(true),
  excludeNoImages: z.boolean().default(false),
});

export const insertConversionSchema = createInsertSchema(conversions)
  .omit({ id: true })
  .extend({
    options: conversionOptionsSchema,
  });

export const insertMarkdownPostSchema = createInsertSchema(markdownPosts)
  .omit({ id: true });

// Types for our application
export type ConversionOptions = z.infer<typeof conversionOptionsSchema>;
export type InsertConversion = z.infer<typeof insertConversionSchema>;
export type Conversion = typeof conversions.$inferSelect;
export type InsertMarkdownPost = z.infer<typeof insertMarkdownPostSchema>;
export type MarkdownPost = typeof markdownPosts.$inferSelect;

// Create a file info type
export type FileInfo = {
  name: string;
  size: number;
  sizeFormatted: string;
  posts?: number;
  type: string;
};

// Progress type
export type ConversionProgress = {
  processed: number;
  total: number;
  percentage: number;
  status: "idle" | "processing" | "completed" | "failed";
  message?: string;
};
