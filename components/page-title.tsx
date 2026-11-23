export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-2">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {children ? <div className="max-w-3xl text-base text-muted-foreground">{children}</div> : null}
    </div>
  );
}
