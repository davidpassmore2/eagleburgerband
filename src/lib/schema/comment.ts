// src/lib/schema/comment.ts
import { z } from "zod";

export const CommentTargetTypeEnum = z.enum(["gig", "tune", "general_announcement"]);

export const CommentSchema = z.object({
  id: z.string(),
  targetType: CommentTargetTypeEnum,
  targetId: z.string(),
  targetTitle: z.string().default(""),
  authorUid: z.string(),
  authorName: z.string(),
  content: z.string().min(1, "Comment content is required"),
  isPinned: z.boolean().default(false),
  isFlagged: z.boolean().default(false),
  flagReason: z.string().default(""),
  flaggedByUid: z.string().default(""),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Comment = z.infer<typeof CommentSchema>;