"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Member = {
  id: string;
  projectId: string;
  userId: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  createdAt: Date | string;
  user: { id: string; username: string; isSuperAdmin: boolean };
};

type Props = {
  projectId: string;
  members: Member[];
  currentUserId: string;
};

export function MembersForm({ projectId, members: initialMembers, currentUserId }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [username, setUsername] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const adminCount = members.filter((m) => m.role === "ADMIN").length;

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);

    const res = await fetch(`/api/v1/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), role: newRole }),
    });

    const data = await res.json();
    setAdding(false);

    if (!res.ok) {
      setAddError(data.error ?? "Failed to add member.");
      return;
    }

    setUsername("");
    router.refresh();
    // Reload fresh list from server
    const listRes = await fetch(`/api/v1/projects/${projectId}/members`);
    if (listRes.ok) {
      const fresh = await listRes.json();
      setMembers(fresh);
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    await fetch(`/api/v1/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.refresh();
    const listRes = await fetch(`/api/v1/projects/${projectId}/members`);
    if (listRes.ok) setMembers(await listRes.json());
  }

  async function handlePromote(userId: string) {
    await fetch(`/api/v1/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSuperAdmin: true }),
    });
    router.refresh();
    const listRes = await fetch(`/api/v1/projects/${projectId}/members`);
    if (listRes.ok) setMembers(await listRes.json());
  }

  async function handleRemove(userId: string) {
    const res = await fetch(`/api/v1/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to remove member.");
      return;
    }
    router.refresh();
    const listRes = await fetch(`/api/v1/projects/${projectId}/members`);
    if (listRes.ok) setMembers(await listRes.json());
  }

  return (
    <div className="space-y-6">
      {/* Add member form */}
      <form onSubmit={handleAddMember} className="space-y-3">
        <h2 className="text-sm font-medium">Add Member</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1"
            data-testid="add-member-username"
          />
          <Select value={newRole} onValueChange={(v) => setNewRole(v as "ADMIN" | "MEMBER" | "VIEWER")}>
            <SelectTrigger className="w-32" data-testid="add-member-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="MEMBER">Member</SelectItem>
              <SelectItem value="VIEWER">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={adding || !username.trim()} data-testid="add-member-submit">
            {adding ? "Adding…" : "Add"}
          </Button>
        </div>
        {addError && <p className="text-xs text-destructive">{addError}</p>}
      </form>

      <Separator />

      {/* Members table */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Members ({members.length})</h2>
        {members.map((m) => {
          const isLastAdmin = m.role === "ADMIN" && adminCount <= 1;
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
              data-testid={`member-row-${m.user.username}`}
            >
              <span className="flex-1 text-sm font-medium">{m.user.username}</span>

              {m.user.isSuperAdmin && (
                <Badge variant="secondary" className="text-xs">Super Admin</Badge>
              )}

              <Select
                value={m.role}
                onValueChange={(v) => handleRoleChange(m.userId, v)}
                disabled={m.userId === currentUserId}
              >
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>

              {!m.user.isSuperAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handlePromote(m.userId)}
                >
                  Make Super-Admin
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-destructive hover:text-destructive"
                disabled={isLastAdmin}
                onClick={() => handleRemove(m.userId)}
                data-testid={`remove-member-${m.user.username}`}
              >
                Remove
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
