// The mark: a portrait photo beside a video frame, the two things a moderator compares
// before a profile becomes visible. Path data from design/make_brand.py; change the shapes
// there and run design/build.sh rather than editing this file.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d="M4 7.2H12A2.4 2.4 0 0 1 14.4 9.6V22.4A2.4 2.4 0 0 1 12 24.8H4A2.4 2.4 0 0 1 1.6 22.4V9.6A2.4 2.4 0 0 1 4 7.2ZM4.8 9.6A0.8 0.8 0 0 0 4 10.4V21.6A0.8 0.8 0 0 0 4.8 22.4H11.2A0.8 0.8 0 0 0 12 21.6V10.4A0.8 0.8 0 0 0 11.2 9.6ZM5.6 13.6A2.4 2.4 0 1 0 10.4 13.6A2.4 2.4 0 1 0 5.6 13.6ZM4 23.2A4 5.6 0 0 1 12 23.2ZM20 7.2H28A2.4 2.4 0 0 1 30.4 9.6V22.4A2.4 2.4 0 0 1 28 24.8H20A2.4 2.4 0 0 1 17.6 22.4V9.6A2.4 2.4 0 0 1 20 7.2ZM20.8 9.6A0.8 0.8 0 0 0 20 10.4V21.6A0.8 0.8 0 0 0 20.8 22.4H27.2A0.8 0.8 0 0 0 28 21.6V10.4A0.8 0.8 0 0 0 27.2 9.6ZM22.4 12.8L22.4 19.2L27.2 16Z" />
    </svg>
  );
}
