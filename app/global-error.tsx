"use client";

/** Last resort when the layout itself fails: plain markup, no app components. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f9f8f6", color: "#2b313b" }}>
        <main style={{ maxWidth: 520, margin: "15vh auto", padding: "0 16px", textAlign: "center" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#165a5e" }}>Trust gate demo</p>
          <h1 style={{ fontSize: 28, margin: "8px 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "#5b646f" }}>The page could not be shown. Try again, or go back to the start.</p>
          <p style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
            <button type="button" onClick={reset} style={{ padding: "8px 14px", borderRadius: 8, border: 0, background: "#165a5e", color: "#fff", cursor: "pointer" }}>
              Try again
            </button>
            {/* A full page load on purpose: the app's own components may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #c9ccd1", color: "#2b313b", textDecoration: "none" }}>
              Back to the start
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
