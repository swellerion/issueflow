"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ProjectRef = { name: string; slug: string };

type NavProps = {
  project: ProjectRef;
  projects: ProjectRef[];
  showSettings: boolean;
  isSuperAdmin?: boolean;
};

export function Nav({ project, projects, showSettings, isSuperAdmin }: NavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <header
      className="flex h-14 items-center px-5 gap-4"
      style={{ backgroundColor: "#0b2a63" }}
    >
      {/* Wordmark */}
      <Link
        href={`/${project.slug}/board`}
        className="font-semibold text-sm tracking-tight text-white shrink-0"
        style={{ fontFamily: "var(--font-title)" }}
      >
        IssueFlow
      </Link>

      {/* Thin vertical divider */}
      <span className="h-5 w-px bg-white/20 shrink-0" />

      {/* Project name / switcher */}
      {projects.length > 1 ? (
        <div className="relative">
          <button
            onClick={() => setSwitcherOpen((o) => !o)}
            className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors"
          >
            <span className="font-medium">{project.name}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
          {switcherOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSwitcherOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-48 rounded-md border bg-popover shadow-md z-20 py-1">
                {projects.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/${p.slug}/board`}
                    onClick={() => setSwitcherOpen(false)}
                    className={`block px-3 py-1.5 text-sm transition-colors hover:bg-muted ${
                      p.slug === project.slug ? "font-medium" : ""
                    }`}
                  >
                    {p.name}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <span className="text-sm text-white/80 font-medium">{project.name}</span>
      )}

      {/* Thin vertical divider */}
      <span className="h-5 w-px bg-white/20 shrink-0" />

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        <NavLink
          href={`/${project.slug}/board`}
          active={pathname.includes("/board")}
        >
          Board
        </NavLink>
        {showSettings && (
          <NavLink
            href={`/${project.slug}/settings/members`}
            active={pathname.includes("/settings")}
          >
            Settings
          </NavLink>
        )}
        {isSuperAdmin && (
          <NavLink href="/admin" active={pathname.startsWith("/admin")}>
            Admin
          </NavLink>
        )}
      </nav>

      {/* New project + user + sign-out */}
      <div className="flex items-center gap-3">
        <Link
          href="/projects/new"
          className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
          title="New project"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New project</span>
        </Link>
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
      {active && (
        <span
          className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
          style={{ backgroundColor: "#11c7e6" }}
        />
      )}
    </Link>
  );
}
