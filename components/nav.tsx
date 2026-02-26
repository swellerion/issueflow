"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

type NavProps = {
  showSettings: boolean;
};

export function Nav({ showSettings }: NavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header
      className="flex h-14 items-center px-5 gap-4"
      style={{ backgroundColor: "#0b2a63" }}
    >
      {/* Wordmark */}
      <Link
        href="/board"
        className="font-semibold text-sm tracking-tight text-white shrink-0"
        style={{ fontFamily: "var(--font-title)" }}
      >
        IssueFlow
      </Link>

      {/* Thin vertical divider */}
      <span className="h-5 w-px bg-white/20 shrink-0" />

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        <NavLink href="/board" active={pathname.startsWith("/board")}>
          Board
        </NavLink>
        {showSettings && (
          <NavLink href="/settings/members" active={pathname.startsWith("/settings")}>
            Settings
          </NavLink>
        )}
      </nav>

      {/* User + sign-out */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/60 hidden sm:block">
          {session?.user?.name}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ redirectTo: "/login" })}
          className="text-white/80 hover:text-white hover:bg-white/10 text-sm"
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`
        relative text-sm px-3 py-1.5 rounded-md transition-colors
        ${active
          ? "text-white font-medium bg-white/10"
          : "text-white/70 hover:text-white hover:bg-white/10"
        }
      `}
    >
      {children}
      {/* Cyan underline for active link */}
      {active && (
        <span
          className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
          style={{ backgroundColor: "#11c7e6" }}
        />
      )}
    </Link>
  );
}
