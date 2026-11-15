import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const managedImages = pgTable("managed_images", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  objectPath: text("object_path").notNull(),
  status: text("status").notNull().default("uploading"),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// The single publication pointer, rather than an identifier-to-image map.
export const imagePublication = pgTable("image_publication", {
  key: text("key").primaryKey(),
  imageId: uuid("image_id").references(() => managedImages.id, { onDelete: "set null" }),
  revision: text("revision").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
