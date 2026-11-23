// The one gate every read goes through. Pages, route handlers and server actions ask
// this module what a viewer may see or do; none of them filter on their own.
// Hidden by default: anything not explicitly allowed below is invisible.
import type { Account, AuditEntry, Conversation, MediaAsset, MediaKind, MemberFilters, Note, World } from "./types";

export type Permission =
  | "review.read" // see the queue, full profiles and media for review
  | "review.decide" // approve, reject with a reason, flag
  | "review.note"
  | "audit.read"
  | "account.restrict"; // suspend, ban, reinstate (admins only)

const ADMIN_ONLY: ReadonlySet<Permission> = new Set(["account.restrict"]);

export type MediaSlot =
  | { state: "available"; asset: MediaAsset }
  | { state: "private" }
  | { state: "none" };

export interface AuditRow extends AuditEntry {
  actor: { id: string; name: string; role: Account["role"] } | null;
  target: { id: string; name: string } | null;
}

export function createPolicy(world: World) {
  const blockedPairs = new Set(world.blocks.map(([blocker, blocked]) => `${blocker}>${blocked}`));
  const blockedEitherWay = (a: string, b: string) => blockedPairs.has(`${a}>${b}`) || blockedPairs.has(`${b}>${a}`);
  const isStaff = (a: Account | null): a is Account =>
    !!a && a.status === "approved" && (a.role === "moderator" || a.role === "admin");

  // #region isVisible
  function isVisible(viewer: Account | null, target: Account): boolean {
    if (!viewer || viewer.id === target.id) return false; // signed out, or yourself
    if (viewer.status !== "approved") return false; // pending, rejected, suspended, banned see no one
    if (target.role !== "member") return false; // staff accounts are not member profiles
    if (target.status !== "approved") return false; // only approved profiles are ever shown
    if (blockedEitherWay(viewer.id, target.id)) return false; // a block hides both sides
    return true;
  }
  // #endregion

  function listVisibleMembers(viewer: Account | null, filters: MemberFilters = {}): Account[] {
    const q = filters.q?.trim().toLowerCase();
    return [...world.accounts.values()]
      .filter((target) => isVisible(viewer, target))
      .filter((t) => !filters.country || t.country === filters.country)
      .filter((t) => !filters.language || t.languages.includes(filters.language))
      .filter((t) => !filters.lookingFor || t.lookingFor === filters.lookingFor)
      .filter((t) => !q || t.displayName.toLowerCase().includes(q) || t.city.toLowerCase().includes(q))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /** Member page lookup. Anything the viewer may not see comes back as null (rendered as 404). */
  function getVisibleMember(viewer: Account | null, id: string): Account | null {
    const target = world.accounts.get(id);
    return target && isVisible(viewer, target) ? target : null;
  }

  // #region canMessage
  function canMessage(from: Account | null, to: Account | null): boolean {
    if (!from || !to || from.role !== "member") return false; // staff do not use member messaging
    return isVisible(from, to) && isVisible(to, from); // both approved, neither blocked
  }
  // #endregion

  // #region canAccessMedia
  function canAccessMedia(viewer: Account | null, asset: MediaAsset): boolean {
    if (!viewer) return false;
    const owner = world.accounts.get(asset.ownerId);
    if (!owner || (owner.photoId !== asset.id && owner.videoId !== asset.id)) return false; // replaced files are gone
    if (viewer.id === owner.id) return viewer.status !== "suspended" && viewer.status !== "banned";
    if (isStaff(viewer)) return true; // moderators review every profile's media
    if (asset.visibility === "private") return false; // private: owner and moderators only
    return isVisible(viewer, owner); // approved-members: whoever may see the profile
  }
  // #endregion

  function getAccessibleAsset(viewer: Account | null, assetId: string): MediaAsset | null {
    const asset = world.assets.get(assetId);
    return asset && canAccessMedia(viewer, asset) ? asset : null;
  }

  /** What a viewer gets for a profile's photo or video: the asset, a "private" placeholder, or nothing. */
  function mediaSlot(viewer: Account | null, owner: Account, kind: MediaKind): MediaSlot {
    const id = kind === "photo" ? owner.photoId : owner.videoId;
    const asset = id ? world.assets.get(id) : undefined;
    if (!asset) return { state: "none" };
    if (canAccessMedia(viewer, asset)) return { state: "available", asset };
    if (asset.visibility === "private" && isVisible(viewer, owner)) return { state: "private" };
    return { state: "none" };
  }

  /** Conversations disappear as soon as either side is hidden from the other. */
  function listConversations(viewer: Account | null): Array<{ conversation: Conversation; other: Account }> {
    if (!viewer) return [];
    return world.conversations.flatMap((conversation) => {
      if (!conversation.members.includes(viewer.id)) return [];
      const otherId = conversation.members[0] === viewer.id ? conversation.members[1] : conversation.members[0];
      const other = world.accounts.get(otherId);
      return other && canMessage(viewer, other) ? [{ conversation, other }] : [];
    });
  }

  function hasConversation(a: Account, b: Account): boolean {
    return world.conversations.some((c) => c.members.includes(a.id) && c.members.includes(b.id));
  }

  /** Members the viewer has blocked, for their own settings page. */
  function listBlockedByViewer(viewer: Account | null): Account[] {
    if (!viewer) return [];
    return world.blocks
      .filter(([blocker]) => blocker === viewer.id)
      .map(([, blocked]) => world.accounts.get(blocked))
      .filter((a): a is Account => !!a && a.role === "member");
  }

  // #region can
  function can(viewer: Account | null, permission: Permission): boolean {
    if (!isStaff(viewer)) return false; // members, pending and restricted accounts: nothing
    if (ADMIN_ONLY.has(permission)) return viewer.role === "admin";
    return true;
  }
  // #endregion

  function reviewQueue(viewer: Account | null): Account[] {
    if (!can(viewer, "review.read")) return [];
    return [...world.accounts.values()]
      .filter((a) => a.role === "member" && a.status === "pending" && a.submittedAt && a.photoId && a.videoId)
      .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
  }

  function listProfilesForReview(viewer: Account | null): Account[] {
    if (!can(viewer, "review.read")) return [];
    return [...world.accounts.values()]
      .filter((a) => a.role === "member")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function getProfileForReview(viewer: Account | null, id: string): Account | null {
    if (!can(viewer, "review.read")) return null;
    const target = world.accounts.get(id);
    return target && target.role === "member" ? target : null;
  }

  function listNotes(viewer: Account | null, targetId: string): Array<Note & { author: string }> {
    if (!can(viewer, "review.read")) return [];
    return world.notes
      .filter((n) => n.targetId === targetId)
      .map((n) => ({ ...n, author: world.accounts.get(n.authorId)?.displayName ?? n.authorId }));
  }

  function listAudit(viewer: Account | null, targetId?: string): AuditRow[] {
    if (!can(viewer, "audit.read")) return [];
    return world.audit
      .filter((e) => !targetId || e.targetId === targetId)
      .map((e) => {
        const actor = world.accounts.get(e.actorId);
        const target = world.accounts.get(e.targetId);
        return {
          ...e,
          actor: actor ? { id: actor.id, name: actor.displayName, role: actor.role } : null,
          target: target ? { id: target.id, name: target.displayName } : null,
        };
      });
  }

  return {
    isVisible,
    listVisibleMembers,
    getVisibleMember,
    canMessage,
    canAccessMedia,
    getAccessibleAsset,
    mediaSlot,
    listConversations,
    hasConversation,
    listBlockedByViewer,
    can,
    reviewQueue,
    listProfilesForReview,
    getProfileForReview,
    listNotes,
    listAudit,
  };
}

export type Policy = ReturnType<typeof createPolicy>;
