// The mark: a portrait photo beside a video frame, the two things a moderator compares
// before a profile becomes visible. Path data from design/make_brand.py; change the shapes
// there and run design/build.sh rather than editing this file.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path
        fillRule="evenodd"
        d="M4.1 7.5H11.9A2.6 2.6 0 0 1 14.5 10.1V21.9A2.6 2.6 0 0 1 11.9 24.5H4.1A2.6 2.6 0 0 1 1.5 21.9V10.1A2.6 2.6 0 0 1 4.1 7.5ZM5.5 13.4A2.5 2.5 0 1 0 10.5 13.4A2.5 2.5 0 1 0 5.5 13.4ZM3.6 22.5A4.4 3.8 0 0 1 12.4 22.5ZM20.1 7.5H27.9A2.6 2.6 0 0 1 30.5 10.1V21.9A2.6 2.6 0 0 1 27.9 24.5H20.1A2.6 2.6 0 0 1 17.5 21.9V10.1A2.6 2.6 0 0 1 20.1 7.5ZM20.3 9.7H27.7A0.6 0.6 0 0 1 28.3 10.3V21.7A0.6 0.6 0 0 1 27.7 22.3H20.3A0.6 0.6 0 0 1 19.7 21.7V10.3A0.6 0.6 0 0 1 20.3 9.7ZM22.3 13.3L22.3 18.7L26.7 16Z"
      />
    </svg>
  );
}
