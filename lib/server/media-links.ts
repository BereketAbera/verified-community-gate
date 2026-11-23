import "server-only";
import { issueMediaLink } from "@/lib/media-signing";
import type { MediaAsset, SignedLink } from "@/lib/types";
import type { Gate } from "./gate";
import { mediaSigningSecret } from "./secrets";

export type { SignedLink };

/** Issues a 60-second link only after the policy allows this viewer to see the asset. */
export function signedLinkFor(gate: Gate, asset: MediaAsset): SignedLink | null {
  if (!gate.viewerKey || !gate.policy.canAccessMedia(gate.viewer, asset)) return null;
  const { url, exp } = issueMediaLink(asset.id, gate.viewerKey, mediaSigningSecret());
  return { url, exp, assetId: asset.id, kind: asset.kind, visibility: asset.visibility };
}
