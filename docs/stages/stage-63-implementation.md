# Stage 63: Discussion Stream Comment Likes & Member Tooltips

## Overview & Scope

Stage 63 introduces peer engagement and social feedback within the Eagleburger Band Portal discussion stream (`CommentsStream.tsx`). Musicians and band leadership can "like" comments posted across tunes, gigs, general announcements, and member suggestions. Hovering over the like button displays a dynamic floating tooltip showing the complete list of member names who liked the comment. Clicking a previously liked comment removes the member's like and immediately removes their name from the tooltip list.

---

## 1. Schema & Data Invariance (Rule 2 Compliance)

### Schema Updates ([`src/lib/schema/comment.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/comment.ts))

* **`CommentLikeItemSchema`**:
  ```typescript
  export const CommentLikeItemSchema = z.object({
    uid: z.string(),
    name: z.string(),
    likedAt: z.string().optional(),
  });
  export type CommentLikeItem = z.infer<typeof CommentLikeItemSchema>;
  ```
* **`CommentSchema` Extensions**:
  * `likes`: Preprocessed array of user IDs (`string[]`) with safe `.default([])`. Enables instantaneous membership checks (`likes.includes(currentUid)`) and atomic `addsOrRemovesOnlyMe` security validation.
  * `likedBy`: Preprocessed array of `CommentLikeItem` objects (`Array<{ uid: string, name: string, likedAt?: string }>`) with safe `.default([])`. Preprocessor handles legacy record maps and object variations gracefully without failing parsing.

---

## 2. Firestore Security Rules Hardening

### Delegated to `firestore-rules-author` ([`firestore.rules`](file:///c:/repos/eagleburgerband/firestore.rules#L264-L277))

```rules
    match /comments/{commentId} {
      allow read: if isMember();
      allow create: if isMember() && request.resource.data.authorUid == request.auth.uid;
      allow update: if canManageContent()
        || (isMember()
            && changedKeys().hasOnly(['isFlagged', 'flagReason', 'flaggedByUid', 'updatedAt'])
            && request.resource.data.isFlagged == true
            && request.resource.data.flaggedByUid == request.auth.uid)
        || (isMember()
            && changedKeys().hasOnly(['likes', 'likedBy', 'updatedAt'])
            && addsOrRemovesOnlyMe('likes'));
      allow delete: if canManageContent()
        || (isMember() && resource.data.get('authorUid', '') == request.auth.uid);
    }
```

* **Restricted Key Scope**: Non-moderator members can only mutate `likes`, `likedBy`, and `updatedAt`.
* **Identity Integrity**: `addsOrRemovesOnlyMe('likes')` strictly limits array changes to the calling user's own `request.auth.uid`, preventing members from altering or forging other users' reactions.
* **Content Immutability**: Comment text, author attribution, and pinned status remain strictly unmodifiable by regular users.

---

## 3. UI/UX Component Implementation ([`src/components/portal/CommentsStream.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/CommentsStream.tsx))

1. **Like Action Button**:
   * Uses `ThumbsUp` icon from `lucide-react`.
   * Unliked state: subtle slate styling (`bg-slate-900/60 text-slate-400 border-slate-800/80 hover:bg-slate-800`).
   * Liked state: vibrant gold accent (`bg-amber-400/15 text-amber-300 border-amber-400/35 hover:bg-amber-400/25`) with a filled thumb icon.
   * Real-time like counter showing total distinct likes.

2. **Interactive Hover Tooltip**:
   * Positioned directly above the like button with backdrop blur (`bg-slate-900/95 backdrop-blur-md`).
   * Header: Shows total count (`X Members Liked` or `Like this comment`).
   * Member List: Lists every member who liked with gold bullet points. Identifies the active user with a gold `(You)` badge.
   * Empty State: Prompts `"Be the first to like this comment!"` when no likes exist yet.
   * Native accessibility `title` attribute backup for mobile/touch screens.

3. **Toggle (Like / Unlike) Workflow**:
   * If not liked: Adds `currentUid` to `likes` and `{ uid, name, likedAt }` to `likedBy`.
   * If already liked: Filters out `currentUid` from both `likes` and `likedBy`.
   * The list of names in the hover tooltip reflects the change immediately.
   * Concurrency & Pending guard: `likePendingIds` prevents duplicate rapid-click requests.

---

## 4. Verification & Testing

* **TypeScript Compilation**: `npx tsc --noEmit` verified clean with `0` errors.
* **Next.js Production Build**: `npm run build` compiled 82 static and dynamic pages with 0 prerendering issues.

