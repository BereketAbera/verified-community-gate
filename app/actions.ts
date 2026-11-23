"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { addMonths } from "@/lib/access";
import { signTestEvent, testModeProvider, type BillingEvent } from "@/lib/billing";
import {
  ComplimentaryInput,
  ModerationInput,
  NoteInput,
  ReplaceMediaInput,
  ReportInput,
  SignupInput,
  VerificationInput,
  VisibilityInput,
  addNote,
  answerRequest,
  block,
  clearReports,
  moderate,
  recordBillingEvent,
  replaceMedia,
  report,
  requestMessage,
  setComplimentary,
  setVisibility,
  signup,
  submitVerification,
  unblock,
  type Result,
} from "@/lib/domain";
import { EXTRA_FIELDS, FAITH_FIELDS } from "@/lib/profile-fields";
import { createPolicy } from "@/lib/policy";
import { newEventId } from "@/lib/sandbox";
import { SandboxFullError } from "@/lib/sandbox-codec";
import { getGate, loadState } from "@/lib/server/gate";
import { signedLinkFor, type SignedLink } from "@/lib/server/media-links";
import { sessionSecret } from "@/lib/server/secrets";
import { saveSandbox } from "@/lib/server/session";
import { buildWorld, iso, viewerFor } from "@/lib/world";

export interface FormState {
  attempt: number;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | string[] | boolean>;
}

const STORAGE_FULL = "storage-full";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join(".") : "form";
    out[key] ??= issue.message;
  }
  return out;
}

/** Saves a successful change. Returns an error message, or null. */
async function commit(result: Result): Promise<string | null> {
  if (!result.ok) return result.error;
  try {
    await saveSandbox(result.sandbox);
  } catch (error) {
    if (error instanceof SandboxFullError) return STORAGE_FULL;
    throw error;
  }
  return null;
}

const storageMessage = (error: string) => (error === STORAGE_FULL ? "Demo storage is full. Use Reset demo to start again." : error);
const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

// ---------------------------------------------------------------- new member

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const answers = (prefix: string, fields: typeof EXTRA_FIELDS) =>
    Object.fromEntries(fields.map((f) => [f.id, text(formData, `${prefix}${f.id}`)]));
  const values = {
    name: text(formData, "name"),
    age: text(formData, "age"),
    city: text(formData, "city"),
    country: text(formData, "country"),
    languages: formData.getAll("languages").map(String),
    lookingFor: text(formData, "lookingFor"),
    about: text(formData, "about"),
    adult: formData.get("adult") === "on",
    terms: formData.get("terms") === "on",
    faithConsent: formData.get("faithConsent") === "on",
  };
  const extra = answers("x_", EXTRA_FIELDS);
  const faith = answers("f_", FAITH_FIELDS);
  const echo = { ...values, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [`x_${k}`, v])), ...Object.fromEntries(Object.entries(faith).map(([k, v]) => [`f_${k}`, v])) };
  const parsed = SignupInput.safeParse({ ...values, extra, faith });
  if (!parsed.success) return { attempt: Date.now(), fieldErrors: fieldErrors(parsed.error), values: echo };
  const detected = (await headers()).get("x-vercel-ip-country");
  const error = await commit(signup(await loadState(), parsed.data, detected));
  if (error) return { attempt: Date.now(), error: storageMessage(error), values: echo };
  redirect("/join/verify");
}

export async function verifyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { photo: text(formData, "photo"), video: text(formData, "video"), prompts: formData.getAll("prompts").map(String) };
  const parsed = VerificationInput.safeParse(values);
  if (!parsed.success) return { attempt: Date.now(), fieldErrors: fieldErrors(parsed.error), values };
  const error = await commit(submitVerification(await loadState(), parsed.data));
  if (error) return { attempt: Date.now(), error: storageMessage(error), values };
  redirect("/members");
}

// ---------------------------------------------------------------- member settings

export async function replaceMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ReplaceMediaInput.safeParse({ kind: formData.get("kind"), choice: formData.get("choice") });
  if (!parsed.success) return { attempt: Date.now(), error: "Choose a sample file." };
  const error = await commit(replaceMedia(await loadState(), parsed.data.kind, parsed.data.choice));
  if (error) return { attempt: Date.now(), error: storageMessage(error) };
  redirect(`/me?notice=replaced-${parsed.data.kind}`);
}

export async function visibilityAction(formData: FormData): Promise<void> {
  const parsed = VisibilityInput.safeParse({ kind: formData.get("kind"), visibility: formData.get("visibility") });
  if (!parsed.success) redirect("/me");
  const error = await commit(setVisibility(await loadState(), parsed.data.kind, parsed.data.visibility));
  redirect(error ? `/me?notice=${error === STORAGE_FULL ? STORAGE_FULL : "error"}` : `/me?notice=visibility-${parsed.data.kind}`);
}

const memberId = (formData: FormData) => {
  const id = text(formData, "targetId");
  return /^[a-z0-9-]{2,24}$/.test(id) ? id : "";
};

export async function blockAction(formData: FormData): Promise<void> {
  const id = memberId(formData);
  const error = await commit(block(await loadState(), id));
  redirect(error ? `/members${error === STORAGE_FULL ? `?notice=${STORAGE_FULL}` : ""}` : `/members?notice=blocked&who=${id}`);
}

export async function unblockAction(formData: FormData): Promise<void> {
  const id = memberId(formData);
  const error = await commit(unblock(await loadState(), id));
  const back = text(formData, "back") === "member" ? `/members/${id}` : "/me";
  redirect(error ? `${back === "/me" ? "/me" : "/members"}${error === STORAGE_FULL ? `?notice=${STORAGE_FULL}` : ""}` : `${back}?notice=unblocked`);
}

export async function messageRequestAction(formData: FormData): Promise<void> {
  const id = memberId(formData);
  const error = await commit(requestMessage(await loadState(), id));
  if (error === "subscription_required") redirect(`/members/${id}?notice=subscribe`);
  redirect(error ? `/members${error === STORAGE_FULL ? `?notice=${STORAGE_FULL}` : ""}` : "/messages?notice=requested");
}

export async function answerRequestAction(formData: FormData): Promise<void> {
  const id = text(formData, "conversationId");
  const answer = text(formData, "answer") === "accept" ? "accepted" : "declined";
  const error = await commit(answerRequest(await loadState(), id, answer));
  if (error) redirect(`/messages${error === STORAGE_FULL ? `?notice=${STORAGE_FULL}` : ""}`);
  redirect(answer === "accepted" ? `/messages/${id}?notice=accepted` : "/messages?notice=declined");
}

export async function reportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ReportInput.safeParse({ targetId: formData.get("targetId"), reason: formData.get("reason") });
  if (!parsed.success) return { attempt: Date.now(), error: parsed.error.issues[0]?.message ?? "Choose a reason." };
  const result = report(await loadState(), parsed.data.targetId, parsed.data.reason);
  const error = await commit(result);
  if (error || !result.ok) {
    return { attempt: Date.now(), error: !error || error === "not_found" ? "That profile is no longer available." : storageMessage(error) };
  }
  // Did this report hide the profile? Ask the policy with the state just saved.
  const world = buildWorld(result.sandbox);
  const hidden = !createPolicy(world).getVisibleMember(viewerFor(world, result.sandbox), parsed.data.targetId);
  redirect(hidden ? "/members?notice=reported-hidden" : `/members/${parsed.data.targetId}?notice=reported`);
}

/** Test-mode checkout through the billing interface: in production this opens the processor's page. */
export async function subscribeAction(formData: FormData): Promise<void> {
  const back = memberId(formData);
  const ctx = await loadState();
  const viewer = ctx.viewer;
  if (!viewer || viewer.role !== "member" || viewer.status !== "approved") redirect("/members");
  const provider = testModeProvider(sessionSecret());
  await provider.createCheckout({ memberId: viewer.id, idempotencyKey: newEventId("chk") });
  // The processor's webhook, signed and checked exactly as a real one would be.
  const event: BillingEvent = { id: newEventId("evt"), type: "subscription.active", memberId: viewer.id, periodEnd: iso(addMonths(ctx.now, 1)) };
  const body = JSON.stringify(event);
  const verified = await provider.handleWebhook(body, signTestEvent(sessionSecret(), body));
  const error = await commit(recordBillingEvent(ctx, verified));
  const target = back ? `/members/${back}` : "/me";
  redirect(error ? `${target}?notice=${error === STORAGE_FULL ? STORAGE_FULL : "error"}` : `${target}?notice=subscribed`);
}

// ---------------------------------------------------------------- moderation

export async function moderateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const action = formData.get("action");
  const parsed = ModerationInput.safeParse({
    targetId: formData.get("targetId"),
    action,
    reason: text(formData, "reason"),
    checklist:
      action === "approve"
        ? {
            samePerson: formData.get("samePerson") === "on",
            prompts: formData.getAll("heardPrompt").map(String),
            languages: formData.getAll("heardLanguage").map(String),
          }
        : undefined,
  });
  if (!parsed.success) return { attempt: Date.now(), error: parsed.error.issues[0]?.message ?? "Invalid decision." };
  const error = await commit(moderate(await loadState(), parsed.data));
  if (error === "forbidden") return { attempt: Date.now(), error: "Your role cannot do that." };
  if (error === "not_found") return { attempt: Date.now(), error: "That profile no longer exists." };
  if (error) return { attempt: Date.now(), error: storageMessage(error) };
  redirect(`/moderate/${parsed.data.targetId}?done=${parsed.data.action}`);
}

export async function noteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = NoteInput.safeParse({ targetId: formData.get("targetId"), text: text(formData, "text") });
  if (!parsed.success) return { attempt: Date.now(), error: parsed.error.issues[0]?.message ?? "Invalid note." };
  const error = await commit(addNote(await loadState(), parsed.data));
  if (error) return { attempt: Date.now(), error: error === "forbidden" ? "Your role cannot add notes." : storageMessage(error) };
  redirect(`/moderate/${parsed.data.targetId}?done=note`);
}

export async function clearReportsAction(formData: FormData): Promise<void> {
  const id = memberId(formData);
  const error = await commit(clearReports(await loadState(), id));
  redirect(`/moderate/${id}?done=${error ? (error === STORAGE_FULL ? STORAGE_FULL : "error") : "reports"}`);
}

export async function complimentaryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ComplimentaryInput.safeParse({ targetId: formData.get("targetId"), until: formData.get("until") });
  if (!parsed.success) return { attempt: Date.now(), error: parsed.error.issues[0]?.message ?? "Choose an end date." };
  const error = await commit(setComplimentary(await loadState(), parsed.data.targetId, parsed.data.until));
  if (error) return { attempt: Date.now(), error: error === "forbidden" ? "Only admins can give complimentary access." : storageMessage(error) };
  redirect(`/moderate/${parsed.data.targetId}?done=access`);
}

// ---------------------------------------------------------------- media links

/** A fresh 60-second link, after asking the policy again. Null if access is gone. */
export async function renewLinkAction(assetId: string): Promise<SignedLink | null> {
  const gate = await getGate();
  const asset = gate.policy.getAccessibleAsset(gate.viewer, String(assetId).slice(0, 60));
  return asset ? signedLinkFor(gate, asset) : null;
}
