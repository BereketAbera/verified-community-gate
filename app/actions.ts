"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";
import {
  ModerationInput,
  NoteInput,
  ReplaceMediaInput,
  SignupInput,
  VerificationInput,
  VisibilityInput,
  addNote,
  block,
  moderate,
  replaceMedia,
  requestMessage,
  setVisibility,
  signup,
  submitVerification,
  unblock,
  type Result,
} from "@/lib/domain";
import { getGate, loadState } from "@/lib/server/gate";
import { signedLinkFor, type SignedLink } from "@/lib/server/media-links";
import { saveSandbox } from "@/lib/server/session";

export interface FormState {
  attempt: number;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | string[] | boolean>;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

async function commit(result: Result): Promise<string | null> {
  if (!result.ok) return result.error;
  await saveSandbox(result.sandbox);
  return null;
}

// ---------------------------------------------------------------- new member

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    age: String(formData.get("age") ?? ""),
    city: String(formData.get("city") ?? ""),
    country: String(formData.get("country") ?? ""),
    languages: formData.getAll("languages").map(String),
    lookingFor: String(formData.get("lookingFor") ?? ""),
    about: String(formData.get("about") ?? ""),
    adult: formData.get("adult") === "on",
    terms: formData.get("terms") === "on",
    faithConsent: formData.get("faithConsent") === "on",
    faith: String(formData.get("faith") ?? ""),
  };
  const parsed = SignupInput.safeParse(values);
  if (!parsed.success) return { attempt: Date.now(), fieldErrors: fieldErrors(parsed.error), values };
  const detected = (await headers()).get("x-vercel-ip-country");
  const error = await commit(signup(await loadState(), parsed.data, detected));
  if (error) return { attempt: Date.now(), error, values };
  redirect("/join/verify");
}

export async function verifyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = VerificationInput.safeParse({ photo: formData.get("photo"), video: formData.get("video") });
  if (!parsed.success) return { attempt: Date.now(), fieldErrors: fieldErrors(parsed.error) };
  const error = await commit(submitVerification(await loadState(), parsed.data));
  if (error) return { attempt: Date.now(), error };
  redirect("/members");
}

// ---------------------------------------------------------------- member settings

export async function replaceMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ReplaceMediaInput.safeParse({ kind: formData.get("kind"), choice: formData.get("choice") });
  if (!parsed.success) return { attempt: Date.now(), error: "Choose a sample file." };
  const error = await commit(replaceMedia(await loadState(), parsed.data.kind, parsed.data.choice));
  if (error) return { attempt: Date.now(), error };
  redirect(`/me?notice=replaced-${parsed.data.kind}`);
}

export async function visibilityAction(formData: FormData): Promise<void> {
  const parsed = VisibilityInput.safeParse({ kind: formData.get("kind"), visibility: formData.get("visibility") });
  if (!parsed.success) redirect("/me");
  const error = await commit(setVisibility(await loadState(), parsed.data.kind, parsed.data.visibility));
  redirect(error ? "/me?notice=error" : `/me?notice=visibility-${parsed.data.kind}`);
}

export async function blockAction(formData: FormData): Promise<void> {
  const error = await commit(block(await loadState(), String(formData.get("targetId") ?? "")));
  redirect(error ? "/members" : "/members?notice=blocked");
}

export async function unblockAction(formData: FormData): Promise<void> {
  const error = await commit(unblock(await loadState(), String(formData.get("targetId") ?? "")));
  redirect(error ? "/me" : "/me?notice=unblocked");
}

export async function messageRequestAction(formData: FormData): Promise<void> {
  const targetId = String(formData.get("targetId") ?? "");
  const error = await commit(requestMessage(await loadState(), targetId));
  redirect(error ? "/members" : "/messages?notice=requested");
}

// ---------------------------------------------------------------- moderation

export async function moderateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ModerationInput.safeParse({
    targetId: formData.get("targetId"),
    action: formData.get("action"),
    reason: String(formData.get("reason") ?? ""),
  });
  if (!parsed.success) return { attempt: Date.now(), error: parsed.error.issues[0]?.message ?? "Invalid decision." };
  const error = await commit(moderate(await loadState(), parsed.data));
  if (error === "forbidden") return { attempt: Date.now(), error: "Your role cannot do that." };
  if (error === "not_found") return { attempt: Date.now(), error: "That profile no longer exists." };
  if (error) return { attempt: Date.now(), error };
  redirect(`/moderate/${parsed.data.targetId}?done=${parsed.data.action}`);
}

export async function noteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = NoteInput.safeParse({ targetId: formData.get("targetId"), text: String(formData.get("text") ?? "") });
  if (!parsed.success) return { attempt: Date.now(), error: parsed.error.issues[0]?.message ?? "Invalid note." };
  const error = await commit(addNote(await loadState(), parsed.data));
  if (error) return { attempt: Date.now(), error: error === "forbidden" ? "Your role cannot add notes." : error };
  redirect(`/moderate/${parsed.data.targetId}?done=note`);
}

// ---------------------------------------------------------------- media links

/** A fresh 60-second link, after asking the policy again. Null if access is gone. */
export async function renewLinkAction(assetId: string): Promise<SignedLink | null> {
  const gate = await getGate();
  const asset = gate.policy.getAccessibleAsset(gate.viewer, assetId);
  return asset ? signedLinkFor(gate, asset) : null;
}
