import "server-only";
import { cache } from "react";
import { createPolicy } from "@/lib/policy";
import { buildWorld, viewerFor } from "@/lib/world";
import { nowSeconds } from "@/lib/media-signing";
import type { DomainContext } from "@/lib/domain";
import { loadSandbox } from "./session";

/** Full state for server actions, which pass it to the pure domain functions. */
export async function loadState(): Promise<DomainContext> {
  const sandbox = await loadSandbox();
  const world = buildWorld(sandbox);
  const policy = createPolicy(world);
  return { sandbox, world, policy, viewer: viewerFor(world, sandbox), now: nowSeconds() };
}

/**
 * What pages and route handlers get: the viewer and the policy, never the raw world.
 * Every read a page makes is a policy call.
 */
export const getGate = cache(async () => {
  const { sandbox, policy, viewer } = await loadState();
  return {
    policy,
    viewer,
    identity: sandbox.as,
    hasSignedUp: sandbox.self !== null,
    /** Display name of this browser's own signup, for the identity menu. */
    selfName: sandbox.self?.name ?? null,
    /** Signed links are bound to this viewer and this browser session. */
    viewerKey: viewer ? `${sandbox.sid}:${viewer.id}` : null,
  };
});

export type Gate = Awaited<ReturnType<typeof getGate>>;
