import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { hasAnyAdminMembership } from "@/lib/services/projects.service";
import Link from "next/link";

export default async function WorkflowsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;

  if (!isSuperAdmin && !(await hasAnyAdminMembership(session.user.id))) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="flex h-14 items-center px-5 gap-4"
        style={{ backgroundColor: "#0b2a63" }}
      >
        <Link
          href="/workflows"
          className="font-semibold text-sm tracking-tight text-white shrink-0"
          style={{ fontFamily: "var(--font-title)" }}
        >
          IssueFlow
        </Link>
        <span className="h-5 w-px bg-white/20 shrink-0" />
        <span className="text-sm text-white/60 font-medium">Workflows</span>
        <div className="flex-1" />
        <Link href="/" className="text-sm text-white/70 hover:text-white transition-colors">
          ← Projects
        </Link>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
