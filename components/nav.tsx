"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="flex h-14 items-center border-b bg-background px-4 gap-4">
      <Link href="/board" className="font-semibold text-sm tracking-tight">
        IssueFlow
      </Link>

      <Separator orientation="vertical" className="h-5" />

      <nav className="flex items-center gap-2 flex-1">
        <Link
          href="/board"
          className={`text-sm px-3 py-1.5 rounded-md transition-colors hover:bg-muted ${
            pathname.startsWith("/board") ? "bg-muted font-medium" : "text-muted-foreground"
          }`}
        >
          Board
        </Link>
      </nav>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {session?.user?.name}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ redirectTo: "/login" })}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
