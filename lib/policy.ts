// The one gate every read goes through. Pages, route handlers and server actions ask
// this module what a viewer may see or do; none of them filter on their own.
// Hidden by default: anything not explicitly allowed below is invisible.
import { FOUNDING, hasActiveAccess } from "./access";
import type { Account, AuditEntry, Conversation, MediaAsset, MediaKind, MemberFilters, Note, Report, World } from "./types";
import { SAMPLE_LIBRARY } from "./types";

export type Permission =
  | "review.read" // see the queue, full profiles, reports and media for review
  | "review.decide" // approve, reject with a reason, flag, mark reports reviewed
  | "review.note"
  | "audit.read"
  | "account.restrict" // suspend, ban, reinstate (admins only)
  | "access.grant"; // complimentary access (admins only)

const ADMIN_ONLY: ReadonlySet<Permission> = new Set(["account.restrict", "access.grant"]);

/** Open reports that hide a profile until a moderator reviews them (R9). */
export const REPORTS_TO_HIDE = 3;

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

  const openReports = new Map<string, Report[]>();
  for (const report of world.reports) {
    const target = world.accounts.get(report.targetId);
    if (!target || (target.reportsClearedAt && Date.parse(report.at) <= Date.parse(target.reportsClearedAt))) continue;
    openReports.set(report.targetId, [...(openReports.get(report.targetId) ?? []), report]);
  }
  const hiddenByReports = (target: Account) => (openReports.get(target.id)?.length ?? 0) >= REPORTS_TO_HIDE;

  // #region isVisible
  function isVisible(viewer: Account | null, target: Account): boolean {
    if (!viewer || viewer.id === target.id) return false; // signed out, or yourself
    if (viewer.status !== "approved") return false; // pending, rejected, suspended, banned see no one
    if (target.role !== "member") return false; // staff accounts are not member profiles
    if (target.status !== "approved") return false; // only approved profiles are ever shown
    if (!target.approvedAt) return false; // and only with a moderator's approval on record
    if (hiddenByReports(target)) return false; // three open reports: hidden until reviewed
    if (blockedEitherWay(viewer.id, target.id)) return false; // a block hides the two from each other
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

  /** How many members can see this account: the reverse of listVisibleMembers. */
  function countWhoCanSee(target: Account): number {
    return [...world.accounts.values()].filter((member) => member.role === "member" && isVisible(member, target)).length;
  }

  /** Member page lookup. Anything the viewer may not see comes back as null (rendered as 404). */
  function getVisibleMember(viewer: Account | null, id: string): Account | null {
    const target = world.accounts.get(id);
    return target && isVisible(viewer, target) ? target : null;
  }

  // #region canMessage
  /** Replying and reading: both approved and visible to each other. Free for everyone. */
  function canMessage(from: Account | null, to: Account | null): boolean {
    if (!from || !to || from.role !== "member") return false; // staff do not use member messaging
    return isVisible(from, to) && isVisible(to, from); // both approved, neither blocked
  }

  /** Starting a conversation also needs paid, complimentary or founding access (R6). */
  function canStartConversation(from: Account | null, to: Account | null): boolean {
    if (!from || !canMessage(from, to)) return false;
    return hasActiveAccess(from.access, world.now);
  }
  // #endregion

  // #region canAccessMedia
  function canAccessMedia(viewer: Account | null, asset: MediaAsset): boolean {
    if (!viewer) return false;
    const owner = world.accounts.get(asset.ownerId);
    // A replaced file is no longer the owner's photo or video, so nobody gets it.
    if (!owner || (owner.photoId !== asset.id && owner.videoId !== asset.id)) return false;
    if (viewer.id === owner.id) return viewer.status !== "suspended" && viewer.status !== "banned";
    if (isStaff(viewer)) return true; // moderators review every profile's media
    if (asset.visibility === "private") return false; // private: owner and moderators only
    return isVisible(viewer, owner); // approved members: whoever may see the profile
  }
  // #endregion

  /** The fictional sample library: for signed-in members choosing files, and for staff. */
  function canUseSampleLibrary(viewer: Account | null): boolean {
    if (!viewer) return false;
    return viewer.role === "member" ? viewer.status !== "suspended" && viewer.status !== "banned" : isStaff(viewer);
  }

  function getAccessibleAsset(viewer: Account | null, assetId: string): MediaAsset | null {
    const asset = world.assets.get(assetId);
    if (!asset) return null;
    const allowed = asset.ownerId === SAMPLE_LIBRARY ? canUseSampleLibrary(viewer) : canAccessMedia(viewer, asset);
    return allowed ? asset : null;
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
  function listConversations(viewer: Account | null): Array<{ conversation: Conversation; other: Account; incoming: boolean }> {
    if (!viewer) return [];
    return world.conversations.flatMap((conversation) => {
      if (!conversation.members.includes(viewer.id)) return [];
      const otherId = conversation.members[0] === viewer.id ? conversation.members[1] : conversation.members[0];
      const other = world.accounts.get(otherId);
      if (!other || !canMessage(viewer, other)) return [];
      return [{ conversation, other, incoming: conversation.state === "requested" && conversation.startedBy !== viewer.id }];
    });
  }

  function getConversation(viewer: Account | null, id: string) {
    return listConversations(viewer).find((c) => c.conversation.id === id) ?? null;
  }

  function conversationWith(a: Account, b: Account): Conversation | null {
    return world.conversations.find((c) => c.members.includes(a.id) && c.members.includes(b.id)) ?? null;
  }

  /** Members the viewer has blocked, for their own settings page. */
  function listBlockedByViewer(viewer: Account | null): Account[] {
    if (!viewer) return [];
    return world.blocks
      .filter(([blocker]) => blocker === viewer.id)
      .map(([, blocked]) => world.accounts.get(blocked))
      .filter((a): a is Account => !!a && a.role === "member");
  }

  function hasBlocked(viewer: Account | null, targetId: string): boolean {
    return !!viewer && blockedPairs.has(`${viewer.id}>${targetId}`);
  }

  function hasReported(viewer: Account | null, targetId: string): boolean {
    return !!viewer && (openReports.get(targetId) ?? []).some((r) => r.reporterId === viewer.id);
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

  /** Members with open reports, most reported first. */
  function reportedProfiles(viewer: Account | null): Array<{ member: Account; reports: Report[]; hidden: boolean }> {
    if (!can(viewer, "review.read")) return [];
    return [...openReports.entries()]
      .flatMap(([id, reports]) => {
        const member = world.accounts.get(id);
        return member && member.role === "member" ? [{ member, reports, hidden: reports.length >= REPORTS_TO_HIDE }] : [];
      })
      .sort((a, b) => b.reports.length - a.reports.length);
  }

  function listOpenReports(viewer: Account | null, targetId: string): Array<Report & { reporter: string }> {
    if (!can(viewer, "review.read")) return [];
    return (openReports.get(targetId) ?? []).map((r) => ({ ...r, reporter: world.accounts.get(r.reporterId)?.displayName ?? r.reporterId }));
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

  /** The founding promotion: three free months for the first 500 sign-ups. */
  function foundingPlaces() {
    return { taken: Math.min(world.foundingPlacesTaken, FOUNDING.places), total: FOUNDING.places };
  }

  /** Name of a staff member, for "set by" lines. */
  function staffName(id: string | null): string | null {
    const account = id ? world.accounts.get(id) : undefined;
    return account && account.role !== "member" ? account.displayName : null;
  }

  return {
    isVisible,
    listVisibleMembers,
    countWhoCanSee,
    getVisibleMember,
    canMessage,
    canStartConversation,
    canAccessMedia,
    canUseSampleLibrary,
    getAccessibleAsset,
    mediaSlot,
    listConversations,
    getConversation,
    conversationWith,
    listBlockedByViewer,
    hasBlocked,
    hasReported,
    can,
    reviewQueue,
    listProfilesForReview,
    reportedProfiles,
    listOpenReports,
    getProfileForReview,
    listNotes,
    listAudit,
    staffName,
    foundingPlaces,
  };
}

export type Policy = ReturnType<typeof createPolicy>;
