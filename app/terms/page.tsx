import type { Metadata } from "next";
import { PageTitle } from "@/components/page-title";
import { TERMS_VERSION } from "@/lib/reference";

export const metadata: Metadata = { title: `Community terms, version ${TERMS_VERSION}` };

const SECTIONS = [
  { title: "Who can join", body: "Members are 18 or older and use their own name, photo and voice. One account per person." },
  { title: "Verification", body: "Every profile stays hidden until a moderator has compared the member's verification video with their photo. Replacing either file starts the review again." },
  { title: "Respect", body: "Be honest and kind. Harassment, requests for money and pressure to move a conversation elsewhere can lead to suspension or a ban." },
  { title: "Privacy", body: "Photos and videos are shown only to approved members, or only to moderators if you make them private. Faith-related answers are stored only with their own consent." },
];

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageTitle eyebrow={`Version ${TERMS_VERSION}`} title="Community terms">
        Placeholder text for this sample. Your attorney&apos;s terms and regional notices (R10) go here; the site records which
        version each member accepted, and when.
      </PageTitle>
      <ol className="flex flex-col gap-4">
        {SECTIONS.map((s, i) => (
          <li key={s.title} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">{i + 1}. {s.title}</h2>
            <p className="mt-1 text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
