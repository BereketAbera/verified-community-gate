export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:mb-8">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
      {children ? <div className="max-w-3xl text-sm text-pretty text-muted-foreground sm:text-base">{children}</div> : null}
    </div>
  );
}
