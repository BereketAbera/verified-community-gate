import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** aria-describedby for a control: its error if there is one, otherwise its hint. */
export function describedBy(id: string, { error, hint }: { error?: string; hint?: string }): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

function Messages({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <>
      {hint && !error ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="text-xs font-medium text-destructive" data-testid="field-error">{error}</p> : null}
    </>
  );
}

/** A labelled single control. The control sets aria-describedby={describedBy(id, ...)} itself. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <Messages id={htmlFor} error={error} hint={hint} />
    </div>
  );
}

/** A group of checkboxes or radios, named by its legend. */
export function GroupField({
  legend,
  id,
  error,
  hint,
  children,
  className,
}: {
  legend: string;
  id: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-1.5", className)} aria-describedby={describedBy(id, { error, hint })}>
      <legend className="mb-1.5 text-sm leading-none font-medium">{legend}</legend>
      {children}
      <Messages id={id} error={error} hint={hint} />
    </fieldset>
  );
}
