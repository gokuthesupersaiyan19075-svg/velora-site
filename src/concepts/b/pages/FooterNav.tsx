"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sitePages } from "@/experiences/registry";
import { SwitchLink } from "./SwitchLink";

export const pageHref = (path: string) => `/thrillverse${path}`;

/** True when `path` (a sitePages path) is the page being shown; detail pages count as Attractions. */
export function isCurrentPage(pathname: string, path: string) {
  const href = pageHref(path);
  return path === "" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Footer links shared by the home footer (Final) and the inner pages. */
export function FooterNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Footer">
      <ul>
        {sitePages.map((p) => (
          <li key={p.path}>
            <Link href={pageHref(p.path)} aria-current={pathname === pageHref(p.path) ? "page" : undefined}>
              {p.label}
            </Link>
          </li>
        ))}
        <li>
          <SwitchLink to="wonderverse">Switch to Wonderverse</SwitchLink>
        </li>
        <li>
          <Link href="/">VELORA entrance</Link>
        </li>
      </ul>
    </nav>
  );
}
