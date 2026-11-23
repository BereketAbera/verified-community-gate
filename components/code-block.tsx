export function CodeBlock({ code, file, language = "ts" }: { code: string; file?: string; language?: string }) {
  return (
    <figure className="overflow-hidden rounded-xl bg-[oklch(0.22_0.02_240)] text-[oklch(0.93_0.01_220)] ring-1 ring-foreground/10">
      {file ? (
        <figcaption className="border-b border-white/10 px-4 py-2 font-mono text-xs text-white/60">{file}</figcaption>
      ) : null}
      <pre className="overflow-x-auto p-4 text-[0.8rem] leading-relaxed">
        <code className={`font-mono language-${language}`}>{code}</code>
      </pre>
    </figure>
  );
}
