import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const imageCleanupJobs = pgTable("image_cleanup_jobs", {
  objectPath: text("object_path").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  claimToken: uuid("claim_token"),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastError: text("last_error"),
}, table => [index("image_cleanup_jobs_available_at_idx").on(table.availableAt)]);

export const insertImageCleanupJobSchema = createInsertSchema(imageCleanupJobs);
export type InsertImageCleanupJob = z.infer<typeof insertImageCleanupJobSchema>;
export type ImageCleanupJob = typeof imageCleanupJobs.$inferSelect;
