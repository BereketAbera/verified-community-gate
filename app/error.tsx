"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown inside the normal layout (header included) when a page throws. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center" data-testid="error-page">
      <span className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">This page could not be shown. Nothing you changed was lost; try again, or go back to the start.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to the start</Link>
        </Button>
      </div>
    </section>
  );
}
