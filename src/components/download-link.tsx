"use client";

import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { withToken } from "@/lib/hooks";

interface DownloadLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  fallbackFilename?: string;
}

/**
 * Hydration-safe download anchor.
 *
 * Why this exists:
 * In SSR, `window` does not exist, so `withToken(url)` produces the base URL:
 *   `<a href="/api/export?kind=bills">`
 * On the client, `withToken` appends `&access_token=...` from localStorage.
 * When React hydrates, the `href` attribute on the client differs from the
 * server-rendered HTML, causing:
 *   "A tree hydrated but some attributes of the server rendered HTML didn't match"
 *
 * Solution:
 * During SSR and initial render, keep the href matching server output.
 * When the user clicks, intercept the click, compute the freshest `withToken(href)`,
 * and trigger the download via a dynamic link click or location navigation.
 * Also update the href after mounting (`mounted === true`) so right-click
 * "Save link as" works with token too.
 */
export function DownloadLink({
  href,
  children,
  onClick,
  fallbackFilename,
  ...rest
}: DownloadLinkProps) {
  const [clientHref, setClientHref] = useState(href);

  // After mount on the client, update the href with the token
  useEffect(() => {
    setClientHref(withToken(href));
  }, [href]);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (onClick) onClick(e);
    if (e.isDefaultPrevented()) return;

    // Ensure the token is appended dynamically at the exact moment of click
    const targetUrl = withToken(href);
    if (targetUrl !== e.currentTarget.href) {
      e.currentTarget.href = targetUrl;
    }
  }

  return (
    <a
      {...rest}
      href={clientHref}
      onClick={handleClick}
      suppressHydrationWarning
    >
      {children}
    </a>
  );
}
