"use client";

import { useCallback, useRef, useState } from "react";
import { renewLinkAction } from "@/app/actions";
import type { SignedLink } from "@/lib/types";

const MAX_RENEWALS = 3;

/**
 * Keeps a 60-second signed link usable. When the browser is refused an expired link (for
 * example after Back restores a cached page), it asks the server for a fresh one, and the
 * server asks the policy again. Null means access is gone.
 */
export function useSignedLink(initial: SignedLink) {
  const [state, setState] = useState<{ source: string; link: SignedLink | null }>({ source: initial.url, link: initial });
  const [renewing, setRenewing] = useState(false);
  const renewals = useRef(0);
  const busy = useRef(false);

  // A new server render brings a new link: start from that one.
  if (state.source !== initial.url) setState({ source: initial.url, link: initial });
  const link = state.source === initial.url ? state.link : initial;

  /** Automatic renewals (after an error) are capped so a broken link cannot loop; a click always renews. */
  const renew = useCallback(async (manual = false) => {
    if (busy.current || (!manual && renewals.current >= MAX_RENEWALS)) return null;
    busy.current = true;
    if (!manual) renewals.current += 1;
    setRenewing(true);
    try {
      const next = await renewLinkAction(initial.assetId);
      setState({ source: initial.url, link: next });
      return next;
    } finally {
      busy.current = false;
      setRenewing(false);
    }
  }, [initial.assetId, initial.url]);

  const expired = useCallback(() => (link ? link.exp * 1000 <= Date.now() : false), [link]);

  return { link, renew, renewing, expired };
}
