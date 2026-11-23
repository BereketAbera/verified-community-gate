"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="-mx-1 flex flex-wrap gap-1">
      {items.map((item) => {
        const active = item.href === "/moderate" ? pathname === "/moderate" || /^\/moderate\/(?!audit)/.test(pathname) : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-accent text-accent-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
