"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsTab({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
        isActive
          ? "text-foreground border-foreground"
          : "text-muted-foreground hover:text-foreground border-transparent hover:border-foreground/30"
      }`}
    >
      {label}
    </Link>
  );
}
