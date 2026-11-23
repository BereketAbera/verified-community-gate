import "server-only";
import { issueMediaLink } from "@/lib/media-signing";
import type { MediaAsset, SignedLink } from "@/lib/types";
import type { Gate } from "./gate";
import { mediaSigningSecret } from "./secrets";

export type { SignedLink };

/** Issues a 60-second link only after the policy allows this viewer to see the asset. */
export function signedLinkFor(gate: Gate, asset: MediaAsset): SignedLink | null {
  if (!gate.viewerKey || !gate.policy.getAccessibleAsset(gate.viewer, asset.id)) return null;
  const { url, exp } = issueMediaLink(asset.id, gate.viewerKey, mediaSigningSecret());
  return { url, exp, assetId: asset.id, kind: asset.kind, visibility: asset.visibility };
}

/** A link by asset id, for files the page knows only by id (the sample library). */
export function signedLinkForId(gate: Gate, assetId: string): SignedLink | null {
  const asset = gate.policy.getAccessibleAsset(gate.viewer, assetId);
  return asset ? signedLinkFor(gate, asset) : null;
}
