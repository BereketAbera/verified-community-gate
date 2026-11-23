import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center" data-testid="not-found">
      <p className="eyebrow">404</p>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">This page could not be found</h1>
      <p className="text-muted-foreground">The link may be wrong, or there is nothing here you can see.</p>
      <Button asChild variant="outline">
        <Link href="/">Back to the start</Link>
      </Button>
    </section>
  );
}
