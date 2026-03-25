"use client";

import { X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type BoardFilters, hasActiveFilters } from "@/lib/board-filters";

type User = { id: string; username: string };
type IssueType = { id: string; name: string };

type Props = {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  users: User[];
  issueTypes: IssueType[];
};

export function BoardFilters({ filters, onChange, users, issueTypes }: Props) {
  const active = hasActiveFilters(filters);

  return (
    <div className="flex items-center gap-2 shrink-0 mb-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search issues…"
          className="h-8 pl-8 text-sm w-52"
        />
      </div>

      {users.length > 0 && (
        <Select
          value={filters.assigneeId ?? "__all__"}
          onValueChange={(v) =>
            onChange({ ...filters, assigneeId: v === "__all__" ? null : v })
          }
        >
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All assignees</SelectItem>
            <SelectItem value="__unassigned__">Unassigned</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {issueTypes.length > 0 && (
        <Select
          value={filters.issueTypeId ?? "__all__"}
          onValueChange={(v) =>
            onChange({ ...filters, issueTypeId: v === "__all__" ? null : v })
          }
        >
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            {issueTypes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          onClick={() =>
            onChange({ search: "", assigneeId: null, issueTypeId: null })
          }
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
