// The signed-link flow for /how-it-works#media: where the policy is asked, where the signature
// is checked, and where a request is refused. Drawn by design/make_diagram.py from its STEPS
// list; change the steps there and run design/build.sh rather than editing this file.

const SUMMARY =
  "Diagram of the signed-link flow. The server asks the policy before it issues a link, and the media route checks the signature and asks the policy again when the link is used. A request is refused with no link, with 403 for a wrong or expired signature, or with 404 when the policy says no. The same steps are listed below.";

export function SignedLinkDiagram() {
  return (
    <figure className="flex w-full max-w-[364px] flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:max-w-[380px] sm:p-5 lg:max-w-none" data-testid="signed-link-diagram">
      <div role="img" aria-label={SUMMARY}>
        <svg viewBox="0 0 880 536" className="hidden h-auto w-full lg:block" aria-hidden="true" focusable="false">
          <line x1={150} y1={40} x2={150} y2={532} stroke="#5b646f" strokeWidth={1.5} strokeOpacity="0.35" strokeDasharray="3 5" />
          <rect x={30} y={0} width={240} height={40} rx={8} fill="#e9f2f3" />
          <text className="font-heading" x={150} y={26} fontSize={16} fill="#1a222b" fontWeight={600} textAnchor="middle">{"Member's browser"}</text>
          <line x1={440} y1={40} x2={440} y2={532} stroke="#5b646f" strokeWidth={1.5} strokeOpacity="0.35" strokeDasharray="3 5" />
          <rect x={320} y={0} width={240} height={40} rx={8} fill="#e9f2f3" />
          <text className="font-heading" x={440} y={26} fontSize={16} fill="#1a222b" fontWeight={600} textAnchor="middle">{"Server: page and policy"}</text>
          <line x1={730} y1={40} x2={730} y2={532} stroke="#5b646f" strokeWidth={1.5} strokeOpacity="0.35" strokeDasharray="3 5" />
          <rect x={610} y={0} width={240} height={40} rx={8} fill="#e9f2f3" />
          <text className="font-heading" x={730} y={26} fontSize={16} fill="#1a222b" fontWeight={600} textAnchor="middle">{"Media route"}</text>
          <rect x={239.6} y={66} width={110.9} height={19} rx={3} fill="#ffffff" />
          <text className="font-sans" x={295} y={79} fontSize={14} fill="#1a222b" textAnchor="middle">{"Opens a profile"}</text>
          <line x1={150} y1={91} x2={430} y2={91} stroke="#165a5e" strokeWidth={1.5} />
          <path d="M438 91L430 86.5L430 95.5Z" fill="#165a5e" />
          <rect x={302} y={105} width={276} height={56} rx={8} fill="#ffffff" stroke="#e0ded8" strokeWidth={1} />
          <text className="font-sans" x={316} y={128} fontSize={14} fill="#1a222b" fontWeight={500}>{"May this viewer see this file?"}</text>
          <circle cx={322} cy={143.5} r={5} fill="none" stroke="#5b646f" strokeWidth={1.5} />
          <line x1={318.7} y1={146.8} x2={325.3} y2={140.2} stroke="#5b646f" strokeWidth={1.5} />
          <text className="font-sans" x={334} y={148} fontSize={13} fill="#5b646f">{"No: no link is issued"}</text>
          <rect x={302} y={173} width={276} height={56} rx={8} fill="#ffffff" stroke="#e0ded8" strokeWidth={1} />
          <text className="font-sans" x={316} y={196} fontSize={14} fill="#1a222b" fontWeight={500}>{"Signs a link for this viewer"}</text>
          <text className="font-sans" x={316} y={216} fontSize={13} fill="#5b646f">{"Expires in 60 s · HMAC-SHA256"}</text>
          <rect x={172.9} y={243} width={244.1} height={19} rx={3} fill="#ffffff" />
          <text className="font-sans" x={295} y={256} fontSize={14} fill="#1a222b" textAnchor="middle">{"Sends the page with the signed link"}</text>
          <line x1={440} y1={268} x2={160} y2={268} stroke="#165a5e" strokeWidth={1.5} />
          <path d="M152 268L160 263.5L160 272.5Z" fill="#165a5e" />
          <rect x={326.5} y={284} width={227} height={19} rx={3} fill="#ffffff" />
          <text className="font-sans" x={440} y={297} fontSize={14} fill="#1a222b" textAnchor="middle">{"Requests the file with its session"}</text>
          <rect x={350.1} y={302} width={179.8} height={18} rx={3} fill="#ffffff" />
          <text className="font-sans" x={440} y={314} fontSize={13} fill="#5b646f" textAnchor="middle">{"The viewer is not in the URL"}</text>
          <line x1={150} y1={326} x2={720} y2={326} stroke="#165a5e" strokeWidth={1.5} />
          <path d="M728 326L720 321.5L720 330.5Z" fill="#165a5e" />
          <rect x={592} y={340} width={276} height={56} rx={8} fill="#ffffff" stroke="#e0ded8" strokeWidth={1} />
          <text className="font-sans" x={606} y={363} fontSize={14} fill="#1a222b" fontWeight={500}>{"Signed for this viewer, not expired?"}</text>
          <circle cx={612} cy={378.5} r={5} fill="none" stroke="#5b646f" strokeWidth={1.5} />
          <line x1={608.7} y1={381.8} x2={615.3} y2={375.2} stroke="#5b646f" strokeWidth={1.5} />
          <text className="font-sans" x={624} y={383} fontSize={13} fill="#5b646f">{"No: 403"}</text>
          <rect x={592} y={408} width={276} height={56} rx={8} fill="#ffffff" stroke="#e0ded8" strokeWidth={1} />
          <text className="font-sans" x={606} y={431} fontSize={14} fill="#1a222b" fontWeight={500}>{"Policy asked again: still allowed?"}</text>
          <circle cx={612} cy={446.5} r={5} fill="none" stroke="#5b646f" strokeWidth={1.5} />
          <line x1={608.7} y1={449.8} x2={615.3} y2={443.2} stroke="#5b646f" strokeWidth={1.5} />
          <text className="font-sans" x={624} y={451} fontSize={13} fill="#5b646f">{"No (suspended, private, blocked): 404"}</text>
          <rect x={389.2} y={478} width={101.6} height={19} rx={3} fill="#ffffff" />
          <text className="font-sans" x={440} y={491} fontSize={14} fill="#1a222b" textAnchor="middle">{"Sends the file"}</text>
          <rect x={297.2} y={497} width={285.6} height={17} rx={3} fill="#ffffff" />
          <text className="font-mono" x={440} y={508} fontSize={12} fill="#5b646f" textAnchor="middle">{"200 · Cache-Control: private, no-store"}</text>
          <line x1={730} y1={520} x2={160} y2={520} stroke="#165a5e" strokeWidth={1.5} />
          <path d="M152 520L160 515.5L160 524.5Z" fill="#165a5e" />
        </svg>
        <svg viewBox="0 0 340 636" className="block h-auto w-full lg:hidden" aria-hidden="true" focusable="false">
          <rect x={8} y={0} width={220} height={32} rx={8} fill="#e9f2f3" />
          <text className="font-heading" x={20} y={21.5} fontSize={15} fill="#1a222b" fontWeight={600}>{"Member's browser"}</text>
          <line x1={30} y1={38} x2={30} y2={59} stroke="#165a5e" strokeWidth={1.5} />
          <path d="M30 67L25.5 59L34.5 59Z" fill="#165a5e" />
          <text className="font-sans" x={46} y={57} fontSize={14} fill="#1a222b">{"Opens a profile"}</text>
          <rect x={8} y={73} width={220} height={32} rx={8} fill="#e9f2f3" />
          <text className="font-heading" x={20} y={94.5} fontSize={15} fill="#1a222b" fontWeight={600}>{"Server: page and policy"}</text>
          <rect x={8} y={113} width={324} height={56} rx={8} fill="#ffffff" stroke="#e0ded8" strokeWidth={1} />
          <text className="font-sans" x={22} y={136} fontSize={14} fill="#1a222b" fontWeight={500}>{"May this viewer see this file?"}</text>
          <circle cx={28} cy={151.5} r={5} fill="none" stroke="#5b646f" strokeWidth={1.5} />
          <line x1={24.7} y1={154.8} x2={31.3} y2={148.2} stroke="#5b646f" strokeWidth={1.5} />
          <text className="font-sans" x={40} y={156} fontSize={13} fill="#5b646f">{"No: no link is issued"}</text>
          <line x1={30} y1={172} x2={30} y2={176} stroke="#165a5e" strokeWidth={1.5} />
          <path d="M30 184L25.5 176L34.5 176Z" fill="#165a5e" />
          <rect x={8} y={187} width={324} height={56} rx={8} fill="#ffffff" stroke="#e0ded8" strokeWidth={1} />
          <text className="font-sans" x={22} y={210} fontSize={14} fill="#1a222b" fontWeight={500}>{"Signs a link for this viewer"}</text>
          <text className="font-sans" x={22} y={230} fontSize={13} fill="#5b646f">{"Expires in 60 s · HMAC-SHA256"}</text>
          <line x1={30} y1={249} x2={30} y2={270} stroke="#165a5e" strokeWidth={1.5} />
          <path d="M30 278L25.5 270L34.5 270Z" fill="#165a5e" />
          <text className="font-sans" x={46} y={268} fontSize={14} fill="#1a222b">{"Sends the page with the signed link"}</text>
          <rect x={8} y={284} width={220} height={32} rx={8} fill="#e9f2f3" />
          <text className="font-heading" x={20} y={305.5} fontSize={15} fill="#1a222b" fontWeight={600}>{"Member's browser"}</text>
          <line x1={30} y1={322} x2={30} y2={360} stroke="#165a5e" strokeWidth={1.5} />
          <path d="M30 368L25.5 360L34.5 360Z" fill="#165a5e" />
          <text className="font-sans" x={46} y={341} fontSize={14} fill="#1a222b">{"Requests the file with its session"}</text>
          <text className="font-sans" x={46} y={358} fontSize={13} fill="#5b646f">{"The viewer is not in the URL"}</text>
          <rect x={8} y={374} width={220} height={32} rx={8} fill="#e9f2f3" />
          <text className="font-heading" x={20} y={395.5} fontSize={15} fill="#1a222b" fontWeight={600}>{"Media route"}</text>
          <rect x={8} y={414} width={324} height={56} rx={8} fill="#ffffff" stroke="#e0ded8" strokeWidth={1} />
          <text className="font-sans" x={22} y={437} fontSize={14} fill="#1a222b" fontWeight={500}>{"Signed for this viewer, not expired?"}</text>
          <circle cx={28} cy={452.5} r={5} fill="none" stroke="#5b646f" strokeWidth={1.5} />
          <line x1={24.7} y1={455.8} x2={31.3} y2={449.2} stroke="#5b646f" strokeWidth={1.5} />
          <text className="font-sans" x={40} y={457} fontSize={13} fill="#5b646f">{"No: 403"}</text>
          <line x1={30} y1={473} x2={30} y2={477} stroke="#165a5e" strokeWidth={1.5} />
          <path d="M30 485L25.5 477L34.5 477Z" fill="#165a5e" />
          <rect x={8} y={488} width={324} height={56} rx={8} fill="#ffffff" stroke="#e0ded8" strokeWidth={1} />
          <text className="font-sans" x={22} y={511} fontSize={14} fill="#1a222b" fontWeight={500}>{"Policy asked again: still allowed?"}</text>
          <circle cx={28} cy={526.5} r={5} fill="none" stroke="#5b646f" strokeWidth={1.5} />
          <line x1={24.7} y1={529.8} x2={31.3} y2={523.2} stroke="#5b646f" strokeWidth={1.5} />
          <text className="font-sans" x={40} y={531} fontSize={13} fill="#5b646f">{"No (suspended, private, blocked): 404"}</text>
          <line x1={30} y1={550} x2={30} y2={588} stroke="#165a5e" strokeWidth={1.5} />
          <path d="M30 596L25.5 588L34.5 588Z" fill="#165a5e" />
          <text className="font-sans" x={46} y={569} fontSize={14} fill="#1a222b">{"Sends the file"}</text>
          <text className="font-mono" x={46} y={586} fontSize={12} fill="#5b646f">{"200 · Cache-Control: private, no-store"}</text>
          <rect x={8} y={602} width={220} height={32} rx={8} fill="#e9f2f3" />
          <text className="font-heading" x={20} y={623.5} fontSize={15} fill="#1a222b" fontWeight={600}>{"Member's browser"}</text>
        </svg>
      </div>
      <figcaption className="text-sm text-muted-foreground">A slashed circle marks where a request stops. An expired link gets 403; the page then asks for a fresh one, so the policy is asked again.</figcaption>
    </figure>
  );
}
