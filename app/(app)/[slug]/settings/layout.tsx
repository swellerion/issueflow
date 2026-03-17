import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjectBySlug, getMembership } from "@/lib/services/projects.service";
import { canManageMembers } from "@/lib/permissions";
import Link from "next/link";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function SettingsLayout({ children, params }: Props) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const membership = await getMembership(project.id, session.user.id);
  if (!canManageMembers(membership?.role ?? null, isSuperAdmin)) {
    redirect(`/${slug}/board`);
  }

  const base = `/${slug}/settings`;
  const tabs = [
    { href: `${base}/members`, label: "Members" },
    { href: `${base}/statuses`, label: "Statuses" },
    { href: `${base}/workflow`, label: "Workflow" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">{project.name}</p>
      </div>
      <div className="flex gap-1 border-b pb-0">
        {tabs.map((tab) => (
          <SettingsTab key={tab.href} href={tab.href} label={tab.label} />
        ))}
      </div>
      {children}
    </div>
  );
}

function SettingsTab({ href, label }: { href: string; label: string }) {
  // We can't use usePathname in a server component, so we render as a plain Link.
  // The active state is handled via CSS :global(.active) applied by client-side nav,
  // but here we keep it simple — the parent page can optionally style its own tab.
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent hover:border-foreground/30 -mb-px"
    >
      {label}
    </Link>
  );
}
