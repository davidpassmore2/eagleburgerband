// src/lib/schema/comment.ts
import { z } from "zod";

export const CommentTargetTypeEnum = z.enum(["gig", "tune", "general_announcement", "suggestion"]);

export const CommentLikeItemSchema = z.object({
  uid: z.string(),
  name: z.string(),
  likedAt: z.string().optional(),
});
export type CommentLikeItem = z.infer<typeof CommentLikeItemSchema>;

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
  likes: z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    return [];
  }, z.array(z.string()).default([])),
  likedBy: z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (val && typeof val === "object") {
      return Object.entries(val).map(([uid, name]) => ({
        uid,
        name: typeof name === "string" ? name : (name as { name?: string })?.name || "Member",
      }));
    }
    return [];
  }, z.array(CommentLikeItemSchema).default([])),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Comment = z.infer<typeof CommentSchema>;