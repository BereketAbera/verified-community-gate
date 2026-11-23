"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A submit button that disables itself while its form is on its way, so a double click sends one request. */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" {...props} disabled={pending || props.disabled} aria-busy={pending || undefined}>
      {pending && pendingLabel ? (
        <>
          <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/** The same guard for a custom-styled submit button. */
export function PendingSubmit({ children, ...props }: Omit<React.ComponentProps<"button">, "type">) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" {...props} disabled={pending || props.disabled} aria-busy={pending || undefined}>
      {children}
    </button>
  );
}
